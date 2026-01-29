const prompt = require('prompt-sync')()
const fs = require('fs/promises')
const employeeFile = './employees.json'
const shiftFile = './shifts.json'
const assignmentFile = './assignments.json'

/**
 * reads all employees from json file and lists them 
 * @returns {Promise<void>}
*/

async function showEmployees() {
    const data = await fs.readFile(employeeFile, 'utf8')
    const employees = JSON.parse(data)

    console.log('Employee ID  Name                 Phone')
    console.log('-----------  -------------------  ---------')

    for (let i = 0; i < employees.length; i++) {
        const id = employees[i].employeeId.padEnd(11, ' ')
        const name = employees[i].name.padEnd(21, ' ')
        const phone = employees[i].phone

        console.log(id + ' ' + name + ' ' + phone)
    }
}

async function addEmployee() {
    let data = await fs.readFile(employeeFile, 'utf8')
    const employees = JSON.parse(data)

    const name = prompt('Enter employee name: ')
    const phone = prompt('Enter phone number: ')

    let num = 0

    for (let i = 0; i < employees.length; i++) {
        const idNum = parseInt(employees[i].employeeId.slice(1))
        if (idNum > num) {
            num = idNum
        }
    }

    let newNum = num + 1
    let newId = 'E'

    if (newNum < 10) {
        newId = newId + '00' + newNum
    }
    else if (newNum < 100) {
        newId = newId + '0' + newNum
    }
    else {
        newId = newId + newNum
    }

    employees[employees.length] = {
        employeeId: newId,
        name: name,
        phone: phone
    }

    await fs.writeFile(employeeFile, JSON.stringify(employees, null, 4))

    console.log('Employee added')
}

/**
 * asks the user for the employee ID, and the shiftID and then assigns the shift to the empolyee.
 * @returns {Promise<void>}
 */
async function assignShift() {
    const employeeId = prompt('Enter employee ID: ')
    const shiftId = prompt('Enter shift ID: ')

    let data = await fs.readFile(employeeFile, 'utf8')
    const employees = JSON.parse(data)

    let employeeFound = false
    for (let i = 0; i < employees.length; i++) {
        if (employees[i].employeeId === employeeId) {
            employeeFound = true
        }
    }

    if (!employeeFound) {
        console.log('Employee does not exist')
        return
    }

    data = await fs.readFile(shiftFile, 'utf8')
    const shifts = JSON.parse(data)

    let shiftFound = false
    for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].shiftId === shiftId) {
            shiftFound = true
        }
    }

    if (!shiftFound) {
        console.log('Shift does not exist')
        return
    }

    data = await fs.readFile(assignmentFile, 'utf8')
    const assignments = JSON.parse(data)

    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId &&
            assignments[i].shiftId === shiftId) {
            console.log('Employee already assigned to shift')
            return
        }
    }

    assignments[assignments.length] = {
        employeeId: employeeId,
        shiftId: shiftId
    }

    await fs.writeFile(assignmentFile, JSON.stringify(assignments, null, 4))

    console.log('Shift Recorded')
}
/**
 * asks the user for employee ID and displays the schedule of the employee.
 * @returns {Promise<void>}
 */
async function viewSchedule() {
    const employeeId = prompt('Enter employee ID: ')
    let data = await fs.readFile(employeeFile, 'utf8')
    const employees = JSON.parse(data)

    let found = false
    for (let i = 0; i < employees.length; i++) {
        if (employees[i].employeeId === employeeId) {
            found = true
        }
    }

    console.log('date,startTime,endTime')

    if (!found) {
        return
    }

    data = await fs.readFile(assignmentFile, 'utf8')
    const assignments = JSON.parse(data)

    data = await fs.readFile(shiftFile, 'utf8')
    const shifts = JSON.parse(data)

    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId) {
            for (let j = 0; j < shifts.length; j++) {
                if (shifts[j].shiftId === assignments[i].shiftId) {
                    console.log(
                        shifts[j].date + ',' +
                        shifts[j].startTime + ',' +
                        shifts[j].endTime)

                }
            }
        }
    }
}

/**
 * Displays the menu and displays the choice of the user 
 * @returns {Promise<void>}
 */
async function main() {
    let exit = false

    while (!exit) {
        console.log('1. Show all employees')
        console.log('2. Add new employee')
        console.log('3. Assign employee to shift')
        console.log('4. View employee schedule')
        console.log('5. Exit')

        const choice = prompt('What is your choice> ')

        if (choice === '1') {
            await showEmployees()
        } else if (choice === '2') {
            await addEmployee()
        } else if (choice === '3') {
            await assignShift()
        } else if (choice === '4') {
            await viewSchedule()
        } else if (choice === '5') {
            exit = true
        } else {
            console.log('Invalid choice')
        }
    }
}

main()
