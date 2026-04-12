
const { MongoClient, ObjectId } = require('mongodb');
const { setServers } = require('node:dns/promises');
setServers(['1.1.1.1', '8.8.8.8']);

const DB_NAME = 'infs3201_winter2026';

let db;
let client;

/**
 * Connect to the Mongodb.
 * @returns {Promise<void>}
 */
async function connect() {
    const uri = process.env.MONGODB_URI ||
        'mongodb+srv://60300920:Ihavealandcruiser2011@cluster0.uynfqk5.mongodb.net/?appName=Cluster0';
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`Connected to MongoDB (${DB_NAME})`);
}


/**
 * Get all employees.
 * @returns {Promise<Array>}
 */
async function getEmployees() {
    return await db.collection('employees').find({}).toArray();
}

/**
 * Save a new employee.
 * @param {Object} employee - { name, phone }
 * @returns {Promise<void>}
 */
async function saveEmployee(employee) {
    await db.collection('employees').insertOne(employee);
}

/**
 * Update an employee name and phone using id.
 * @param {string} id
 * @param {string} name
 * @param {string} phone
 * @returns {Promise<void>}
 */
async function updateEmployee(id, name, phone) {
    await db.collection('employees').updateOne(
        { _id: new ObjectId(id) },
        { $set: { name: name, phone: phone } }
    );
}

/**
 * Find a employee by their id.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function findEmployeeById(id) {
    try {
        return await db.collection('employees').findOne({ _id: new ObjectId(id) });
    } catch (e) {
        return null;
    }
}


/**
 * Get all shifts.
 * @returns {Promise<Array>}
 */
async function getShifts() {
    return await db.collection('shifts').find({}).toArray();
}

/**
 * Find a shift by shiftid.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function findShiftById(id) {
    try {
        return await db.collection('shifts').findOne({ _id: new ObjectId(id) });
    } catch (e) {
        return null;
    }
}

/**
 * Find all shifts that contain a specific employee ObjectId in their employees array.
 * @param {ObjectId} employeeObjectId
 * @returns {Promise<Array>}
 */
async function getShiftsForEmployee(employeeObjectId) {
    return await db.collection('shifts').find(
        { employees: employeeObjectId }
    ).toArray();
}

/**
 * Finduser by username.
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function findUserByUsername(username) {
    return await db.collection('users').findOne({ username: username });
}


/**
 * Save session.
 * @param {Object} session - { sessionId, username, expiry }
 * @returns {Promise<void>}
 */
async function saveSession(session) {
    await db.collection('sessions').insertOne(session);
}

/**
 * Find session by sessionId.
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
async function findSession(sessionId) {
    return await db.collection('sessions').findOne({ sessionId: sessionId });
}

/**
 * Extend the expiry time of an existing session.
 * @param {string} sessionId
 * @param {Date} newExpiry
 * @returns {Promise<void>}
 */
async function updateSessionExpiry(sessionId, newExpiry) {
    await db.collection('sessions').updateOne(
        { sessionId: sessionId },
        { $set: { expiry: newExpiry } }
    );
}

/**
 * Delete a session .
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
async function deleteSession(sessionId) {
    await db.collection('sessions').deleteOne({ sessionId: sessionId });
}

/**
 * Add a security log entry.
 * @param {Object} entry 
 * @returns {Promise<void>}
 */
async function logSecurityEvent(entry) {
    await db.collection('security_log').insertOne(entry);
}

/**
 * Save a 2FA code for a user.
 * @param {Object} twoFARecord
 * @returns {Promise<void>}
 */
async function save2FACode(twoFARecord) {
    await db.collection('twofactor').deleteMany({ username: twoFARecord.username });
    await db.collection('twofactor').insertOne(twoFARecord);
}

/**
 * find a 2FA record by username.
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function find2FACode(username) {
    return await db.collection('twofactor').findOne({ username: username });
}

/**
 * delete a 2FA record for a user.
 * @param {string} username
 * @returns {Promise<void>}
 */
async function delete2FACode(username) {
    await db.collection('twofactor').deleteMany({ username: username });
}

/**
 * Increment the failed login attempts for a user.
 * @param {string} username
 * @returns {Promise<void>}
 */
async function incrementFailedAttempts(username) {
    await db.collection('users').updateOne(
        { username: username },
        { $inc: { failedAttempts: 1 } }
    );
}

/**
 * Reset the failed login attempts for a user to 0.
 * @param {string} username
 * @returns {Promise<void>}
 */
async function resetFailedAttempts(username) {
    await db.collection('users').updateOne(
        { username: username },
        { $set: { failedAttempts: 0 } }
    );
}

/**
 * Lock a user account.
 * @param {string} username
 * @returns {Promise<void>}
 */
async function lockAccount(username) {
    await db.collection('users').updateOne(
        { username: username },
        { $set: { locked: true } }
    );
}




module.exports = {
    connect,
    getEmployees,
    saveEmployee,
    updateEmployee,
    findEmployeeById,
    getShifts,
    findShiftById,
    getShiftsForEmployee,
    findUserByUsername,
    saveSession,
    findSession,
    updateSessionExpiry,
    deleteSession,
    logSecurityEvent,
    save2FACode,
    find2FACode,
    delete2FACode,
    incrementFailedAttempts,
    resetFailedAttempts,
    lockAccount
};