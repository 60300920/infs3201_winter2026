const fs = require('fs/promises')

const employeeFile = './employees.json'
const shiftFile = './shifts.json'
const assignmentFile = './assignments.json'
const configFile = './config.json'

/**
 * gets all employees from the JSON file
 * @returns {Promise<Array>} 
 */
async function getEmployees() {
    return JSON.parse(await fs.readFile(employeeFile, 'utf8'))
}

/**
 * saves employees array to the JSON file
 * @param {Array} data 
 * @returns {Promise<void>}
 */
async function saveEmployees(data) {
    await fs.writeFile(employeeFile, JSON.stringify(data, null, 4))
}

/**
 * gets all shifts from the JSON file
 * @returns {Promise<Array>}
 */
async function getShifts() {
    return JSON.parse(await fs.readFile(shiftFile, 'utf8'))
}

/**
 * gets all assignments from the JSON file
 * @returns {Promise<Array>} 
 */
async function getAssignments() {
    return JSON.parse(await fs.readFile(assignmentFile, 'utf8'))
}

/**
 * saves assignments array to the JSON file
 * @param {Array} data 
 * @returns {Promise<void>}
 */
async function saveAssignments(data) {
    await fs.writeFile(assignmentFile, JSON.stringify(data, null, 4))
}

/**
 * retrieves the config.json file
 * @returns {Promise<Object>} 
 */
async function getConfig() {
    return JSON.parse(await fs.readFile(configFile, 'utf8'))
}

/**
 * finds an employee by their ID
 * @param {string} employeeId 
 * @returns {Promise<Object|null>} 
 */
async function findEmployeeById(employeeId) {
    const employees = await getEmployees()
    
    for (let i = 0; i < employees.length; i++) {
        if (employees[i].employeeId === employeeId) {
            return employees[i]
        }
    }
    return null
}

/**
 * finds shift by its ID
 * @param {string} shiftId 
 * @returns {Promise<Object|null>} 
 */
async function findShiftById(shiftId) {
    const shifts = await getShifts()
    
    for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].shiftId === shiftId) {
            return shifts[i]
        }
    }
    return null
}

/**
 * finds all assignments for an employee
 * @param {string} employeeId 
 * @returns {Promise<Array>} 
 */
async function findAssignmentsByEmployeeId(employeeId) {
    const assignments = await getAssignments()
    const result = []
    
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId) {
            result.push(assignments[i])
        }
    }
    return result
}

/**
 * finds an assignment by employee ID and shift ID
 * @param {string} employeeId 
 * @param {string} shiftId 
 * @returns {Promise<Object|null>} 
 */
async function findAssignment(employeeId, shiftId) {
    const assignments = await getAssignments()
    
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId && 
            assignments[i].shiftId === shiftId) {
            return assignments[i]
        }
    }
    return null
}

module.exports = {
    getEmployees,
    saveEmployees,
    getShifts,
    getAssignments,
    saveAssignments,
    findEmployeeById,
    findShiftById,
    findAssignmentsByEmployeeId,
    findAssignment,
    getConfig
}