const prompt = require('prompt-sync')()
const business = require('./business')

/**
 * displays all employees in a formatted table
 * @returns {Promise<void>}
 */
async function showEmployees() {
    const employees = await business.getAllEmployees()
    
    console.log('\nEmployee ID  Name                 Phone')
    console.log('-----------  -------------------  ---------')
    
    for (let i = 0; i < employees.length; i++) {
        const id = employees[i].employeeId.padEnd(11, ' ')
        const name = employees[i].name.padEnd(21, ' ')
        const phone = employees[i].phone
        
        console.log(id + ' ' + name + ' ' + phone)
    }
    console.log('')
}

/**
 * addes new employee
 * @returns {Promise<void>}
 */
async function addEmployee1() {
    const name = prompt('Enter employee name: ')
    const phone = prompt('Enter phone number: ')
    
    const result = await business.addEmployee(name, phone)
    console.log(result + '\n')
}

/**
 * assigns shift and calculates daily hour limit validation
 * @returns {Promise<void>}
 */
async function assignShift1() {
    const employeeId = prompt('Enter employee ID: ')
    const shiftId = prompt('Enter shift ID: ')
    
    const result = await business.assignShift(employeeId, shiftId)
    console.log(result + '\n')
}

/**
 * displays the employee schedule
 * @returns {Promise<void>}
 */
async function viewSchedule1() {
    const employeeId = prompt('Enter employee ID: ')
    
    const employee = await business.employeeExists(employeeId)
    if (!employee) {
        console.log('Employee not found\n')
        return
    }
    
    const schedule = await business.getEmployeeSchedule(employeeId)
    
    if (schedule === null) {
        console.log('Employee not found\n')
        return
    }
    
    console.log('\nSchedule for ' + employeeId + ':')
    console.log('Date       | Start Time | End Time')
    console.log('-----------|------------|----------')
    
    for (let i = 0; i < schedule.length; i++) {
        const date = schedule[i].date.padEnd(10, ' ')
        const start = schedule[i].startTime.padEnd(11, ' ')
        const end = schedule[i].endTime
        
        console.log(date + '| ' + start + '| ' + end)
    }
    console.log('')
}

/**
 * displays the main menu for user choice
 * @returns {Promise<void>}
 */
async function displayMenu() {
    let exit = false
    
    while (!exit) {
        console.log('=== EMPLOYEE SCHEDULING SYSTEM ===')
        console.log('1. Show all employees')
        console.log('2. Add new employee')
        console.log('3. Assign employee to shift')
        console.log('4. View employee schedule')
        console.log('5. Exit')
        console.log('==================================')
        
        const choice = prompt('What is your choice> ')
        console.log('')
        
        if (choice === '1') {
            await showEmployees()
        } else if (choice === '2') {
            await addEmployee1()
        } else if (choice === '3') {
            await assignShift1()
        } else if (choice === '4') {
            await viewSchedule1()
        } else if (choice === '5') {
            exit = true
            console.log('Goodbye!')
        } else {
            console.log('Invalid choice. Please enter 1-5.\n')
        }
    }
}

displayMenu()
