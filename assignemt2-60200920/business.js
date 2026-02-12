const persistence = require('./persistence')

/**
 * Computes the duration of a shift in hours
 * Generated using: ChatGPT-4
 * Prompt: " generate a java function called computeShiftDuration(startTime, endTime),which would tell you how many hours (as a real number) between the startTime and endTime.  
 * For example, if a shift starts at 11:00 and ends at 13:30 then the number of hours is 2.5."
 * @param {string} startTime
 * @param {string} endTime
 * @returns {number} 
 */
function computeShiftDuration(startTime, endTime) {
    const startParts = startTime.split(':')
    const endParts = endTime.split(':')
    
    const startHours = Number(startParts[0])
    const startMinutes = Number(startParts[1])
    const endHours = Number(endParts[0])
    const endMinutes = Number(endParts[1])
    
    const startTotal = startHours + (startMinutes / 60)
    const endTotal = endHours + (endMinutes / 60)
    
    return endTotal - startTotal
}

/**
 * display all the employees
 * @returns {Promise<Array>}
 */
async function getAllEmployees() {
    return await persistence.getEmployees()
}

/**
 * add a new employee to the system
 * @param {string} name 
 * @param {string} phone 
 * @returns {Promise<string>} 
 */
async function addEmployee(name, phone) {
    const employees = await persistence.getEmployees()
    
    let highestId = 0
    
    for (let i = 0; i < employees.length; i++) {
        const idNum = parseInt(employees[i].employeeId.slice(1))
        if (idNum > highestId) {
            highestId = idNum
        }
    }
    
    const newId = 'E' + String(highestId + 1).padStart(3, '0')
    
    const updatedEmployees = [
        ...employees,
        {
            employeeId: newId,
            name: name,
            phone: phone
        }
    ]
    
    await persistence.saveEmployees(updatedEmployees)
    return "Employee added successfully"
}

/**
 * checks if the employee already exssists
 * @param {string} employeeId 
 * @returns {Promise<boolean>} 
 */
async function employeeExists(employeeId) {
    const employee = await persistence.findEmployeeById(employeeId)
    return employee !== null
}

/**
 * checks if a shift exists
 * @param {string} shiftId
 * @returns {Promise<boolean>}
 */
async function shiftExists(shiftId) {
    const shift = await persistence.findShiftById(shiftId)
    return shift !== null
}

/**
 * checks if an employee is assigned to a specific shift
 * @param {string} employeeId 
 * @param {string} shiftId 
 * @returns {Promise<boolean>} 
 */
async function isEmployeeAssignedToShift(employeeId, shiftId) {
    const assignment = await persistence.findAssignment(employeeId, shiftId)
    return assignment !== null
}

/**
 * calculates the total number of hours of an employee on a specific date
 * @param {string} employeeId
 * @param {string} date 
 * @returns {Promise<number>} 
 */
async function calculateDailyHours(employeeId, date) {
    const assignments = await persistence.findAssignmentsByEmployeeId(employeeId)
    
    let totalHours = 0
    
    for (let i = 0; i < assignments.length; i++) {
        const shift = await persistence.findShiftById(assignments[i].shiftId)
        
        if (shift !== null && shift.date === date) {
            totalHours += computeShiftDuration(shift.startTime, shift.endTime)
        }
    }
    
    return totalHours
}

/**
 * assigns an employee to a shift with the daily hour limit
 * @param {string} employeeId 
 * @param {string} shiftId 
 * @returns {Promise<string>} 
 */
async function assignShift(employeeId, shiftId) {
    const employee = await persistence.findEmployeeById(employeeId)
    if (employee === null) {
        return "Employee does not exist"
    }
    
    const shift = await persistence.findShiftById(shiftId)
    if (shift === null) {
        return "Shift does not exist"
    }
    
    const existingAssignment = await persistence.findAssignment(employeeId, shiftId)
    if (existingAssignment !== null) {
        return "Employee already assigned"
    }
    
    const dailyHours = await calculateDailyHours(employeeId, shift.date)
    const shiftHours = computeShiftDuration(shift.startTime, shift.endTime)
    const totalHours = dailyHours + shiftHours
    
    const config = await persistence.getConfig()
    
    if (totalHours > config.maxDailyHours) {
        return "Daily hour limit exceeded"
    }
    
    const assignments = await persistence.getAssignments()
    const updatedAssignments = [
        ...assignments,
        { employeeId, shiftId }
    ]
    await persistence.saveAssignments(updatedAssignments)
    
    return "Shift Recorded"
}

/**
 * displays the schedule for a employee
 * @param {string} employeeId 
 * @returns {Promise<Array|null>} 
 */
async function getEmployeeSchedule(employeeId) {
    const employee = await persistence.findEmployeeById(employeeId)
    if (employee === null) {
        return null
    }
    
    const assignments = await persistence.findAssignmentsByEmployeeId(employeeId)
    const result = []
    
    for (let i = 0; i < assignments.length; i++) {
        const shift = await persistence.findShiftById(assignments[i].shiftId)
        if (shift !== null) {
            result[result.length] = shift
        }
    }
    
    return result
}

module.exports = {
    computeShiftDuration,
    getAllEmployees,
    addEmployee,
    assignShift,
    getEmployeeSchedule,
    employeeExists,
    shiftExists,
    isEmployeeAssignedToShift,
    calculateDailyHours
}