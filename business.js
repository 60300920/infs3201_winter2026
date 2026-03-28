'use strict';

const { ObjectId } = require('mongodb');
const persistence = require('./persistence');
const crypto = require('crypto');

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
 * @param {string} username
 * @param {string} password - plaintext
 * @returns {Promise<Object|null>} user document if valid, null otherwise
 */
async function validateLogin(username, password) {
    const user = await persistence.findUserByUsername(username);
    if (user === null) {
        return null;
    }

    const hashed = hashPassword(password);
    if (user.password !== hashed) {
        return null;
    }

    return user;
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
    createSession,
    getSession,
    destroySession
};