
const { ObjectId } = require('mongodb');
const persistence = require('./persistence');
const crypto = require('crypto');
const emailSystem = require('./emailSystem');

/**
 * Compute the duration of a shift in hours.
 * For example: 11:00 to 13:30 is 2.5 hours.
 * @param {string} startTime - "HH:MM"
 * @param {string} endTime - "HH:MM"
 * @returns {number}
 */
function computeShiftDuration(startTime, endTime) {
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');

    const startHours = Number(startParts[0]);
    const startMinutes = Number(startParts[1]);
    const endHours = Number(endParts[0]);
    const endMinutes = Number(endParts[1]);

    const startTotal = startHours + (startMinutes / 60);
    const endTotal = endHours + (endMinutes / 60);

    return endTotal - startTotal;
}

/**
 * Get all employees.
 * @returns {Promise<Array>}
 */
async function getAllEmployees() {
    return await persistence.getEmployees();
}

/**
 * Get a single employee by their string _id.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getEmployeeById(id) {
    return await persistence.findEmployeeById(id);
}

/**
 * Check whether an employee exists.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function employeeExists(id) {
    const employee = await persistence.findEmployeeById(id);
    return employee !== null;
}

/**
 * Add a new employee. MongoDB generates the _id automatically.
 * @param {string} name
 * @param {string} phone
 * @returns {Promise<void>}
 */
async function addEmployee(name, phone) {
    await persistence.saveEmployee({ name: name, phone: phone });
}


/**
 * Get all shifts assigned to a specific employee.
 * @param {string} id - string form of the employee's ObjectId
 * @returns {Promise<Array|null>}
 */
async function getEmployeeSchedule(id) {
    const employee = await persistence.findEmployeeById(id);
    if (employee === null) {
        return null;
    }

    try {
        const empObjectId = new ObjectId(id);
        return await persistence.getShiftsForEmployee(empObjectId);
    } catch (e) {
        return null;
    }
}

/**
 * Calculate total hours worked by an employee on a specific date.
 * @param {string} id - string form of the employee's ObjectId
 * @param {string} date - "YYYY-MM-DD"
 * @returns {Promise<number>}
 */
async function calculateDailyHours(id, date) {
    try {
        const empObjectId = new ObjectId(id);
        const shifts = await persistence.getShiftsForEmployee(empObjectId);

        let totalHours = 0;
        for (let i = 0; i < shifts.length; i++) {
            if (shifts[i].date === date) {
                totalHours += computeShiftDuration(shifts[i].startTime, shifts[i].endTime);
            }
        }

        return totalHours;
    } catch (e) {
        return 0;
    }
}


/**
 * Hash a password using SHA-256.
 * @param {string} password
 * @returns {string} hex digest
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Validate login credentials against the users collection.
 * Checks for locked accounts and tracks failed attempts.
 * @param {string} username
 * @param {string} password - plaintext
 * @returns {Promise<Object>} { success, user, message }
 */
async function validateLogin(username, password) {
    const user = await persistence.findUserByUsername(username);
    if (user === null) {
        return { success: false, user: null, message: 'Invalid username or password' };
    }

    // Check if account is locked
    if (user.accountLocked === true) {
        return { success: false, user: null, message: 'Account is locked. Contact an administrator.' };
    }

    const hashed = hashPassword(password);
    if (user.password !== hashed) {
        // Increment failed attempts
        await persistence.incrementFailedAttempts(username);
        const updated = await persistence.findUserByUsername(username);
        const attempts = updated.failedLoginAttempts || 1;

        // Send warning email after 3 failed attempts
        if (attempts === 3) {
            const email = updated.email || username + '@example.com';
            await emailSystem.sendSuspiciousActivityAlert(email, username);
        }

        // Lock account after 10 failed attempts
        if (attempts >= 10) {
            await persistence.lockAccount(username);
            const email = updated.email || username + '@example.com';
            await emailSystem.sendAccountLockedAlert(email, username);
            return { success: false, user: null, message: 'Account is locked due to too many failed attempts.' };
        }

        return { success: false, user: null, message: 'Invalid username or password' };
    }

    // Successful password check - reset failed attempts
    await persistence.resetFailedAttempts(username);
    return { success: true, user: user, message: null };
}


const TWO_FA_DURATION_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Generate a random 6-digit 2FA code.
 * @returns {string}
 */
function generate2FACode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}

/**
 * Create and send a 2FA code for a user.
 * @param {string} username
 * @param {string} email
 * @returns {Promise<void>}
 */
async function create2FACode(username, email) {
    const code = generate2FACode();
    const expiry = new Date(Date.now() + TWO_FA_DURATION_MS);
    await persistence.save2FACode({ username: username, code: code, expiry: expiry });
    await emailSystem.send2FACode(email, code);
}

/**
 * Validate a 2FA code entered by the user.
 * @param {string} username
 * @param {string} code
 * @returns {Promise<boolean>}
 */
async function validate2FACode(username, code) {
    const record = await persistence.find2FACode(username);
    if (record === null) {
        return false;
    }

    if (record.expiry < new Date()) {
        await persistence.delete2FACode(username);
        return false;
    }

    if (record.code !== code) {
        return false;
    }

    await persistence.delete2FACode(username);
    return true;
}


const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a random session ID.
 * @returns {string}
 */
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create and save a new session for a user.
 * @param {string} username
 * @returns {Promise<string>} the new sessionId
 */
async function createSession(username) {
    const sessionId = generateSessionId();
    const expiry = new Date(Date.now() + SESSION_DURATION_MS);
    await persistence.saveSession({ sessionId: sessionId, username: username, expiry: expiry });
    return sessionId;
}

/**
 * Retrieve a valid session and extend its expiry by 5 minutes.
 * Returns null if the session is missing or expired.
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
async function getSession(sessionId) {
    if (!sessionId) {
        return null;
    }

    const session = await persistence.findSession(sessionId);
    if (session === null) {
        return null;
    }

    if (session.expiry < new Date()) {
        await persistence.deleteSession(sessionId);
        return null;
    }

    // Extend by another 5 minutes on every valid visit
    const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
    await persistence.updateSessionExpiry(sessionId, newExpiry);

    return session;
}

/**
 * Delete a session (logout).
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
async function destroySession(sessionId) {
    await persistence.deleteSession(sessionId);
}

module.exports = {
    computeShiftDuration,
    getAllEmployees,
    getEmployeeById,
    employeeExists,
    addEmployee,
    getEmployeeSchedule,
    calculateDailyHours,
    hashPassword,
    validateLogin,
    create2FACode,
    validate2FACode,
    createSession,
    getSession,
    destroySession
};