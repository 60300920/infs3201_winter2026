'use strict';

const { MongoClient, ObjectId } = require('mongodb');
const { setServers } = require('node:dns/promises');
setServers(['1.1.1.1', '8.8.8.8']);

const DB_NAME = 'infs3201_winter2026';

let db;
let client;

/**
 * Connect to the MongoDB database.
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

// ─── Employees ────────────────────────────────────────────────────────────────

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
 * Update an employee's name and phone by their string _id.
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
 * Find a single employee by their string _id.
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

// ─── Shifts ───────────────────────────────────────────────────────────────────

/**
 * Get all shifts.
 * @returns {Promise<Array>}
 */
async function getShifts() {
    return await db.collection('shifts').find({}).toArray();
}

/**
 * Find a single shift by its string _id.
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

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * Find a user by username.
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function findUserByUsername(username) {
    return await db.collection('users').findOne({ username: username });
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

/**
 * Save a new session.
 * @param {Object} session - { sessionId, username, expiry }
 * @returns {Promise<void>}
 */
async function saveSession(session) {
    await db.collection('sessions').insertOne(session);
}

/**
 * Find a session by its sessionId.
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
 * Delete a session (used on logout or expiry).
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
async function deleteSession(sessionId) {
    await db.collection('sessions').deleteOne({ sessionId: sessionId });
}

// ─── Security Log ─────────────────────────────────────────────────────────────

/**
 * Insert a security log entry.
 * @param {Object} entry - { timestamp, username, url, method }
 * @returns {Promise<void>}
 */
async function logSecurityEvent(entry) {
    await db.collection('security_log').insertOne(entry);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

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
    logSecurityEvent
};