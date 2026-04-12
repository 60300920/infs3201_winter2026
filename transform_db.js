const { MongoClient, ObjectId } = require('mongodb');
const { setServers } = require('node:dns/promises');
setServers(['1.1.1.1', '8.8.8.8']);

const DB_NAME = 'infs3201_winter2026';
const URI = process.env.MONGODB_URI || 'mongodb+srv://60300920:Ihavealandcruiser2011@cluster0.uynfqk5.mongodb.net/?appName=Cluster0';

let db;
let client;

/**
 * Connect to MongoDB.
 * @returns {Promise<void>}
 */
async function connect() {
    client = new MongoClient(URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB.');
}

/**
 * Disconnect from MongoDB.
 * @returns {Promise<void>}
 */
async function disconnect() {
    await client.close();
    console.log('Disconnected.');
}

/**
 * Step 1: Add an empty employees array to every shift document.
 * @returns {Promise<void>}
 */
async function step1_addEmptyEmployeesArray() {
    console.log('\n--- Step 1: Adding empty employees[] to shifts ---');
    const result = await db.collection('shifts').updateMany(
        { employees: { $exists: false } },
        { $set: { employees: [] } }
    );
    console.log(`Modified ${result.modifiedCount} shift(s).`);
}

/**
 * Step 2: Embed employee ObjectIds into each shift's employees array.
 * @returns {Promise<void>}
 */
async function step2_embedEmployeesInShifts() {
    console.log('\n--- Step 2: Embedding employee ObjectIds into shifts ---');

    const assignments = await db.collection('assignments').find({}).toArray();
    console.log(`Found ${assignments.length} assignment(s).`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];

        const employee = await db.collection('employees').findOne(
            { employeeId: assignment.employeeId }
        );
        if (employee === null) {
            console.log(`  SKIP: No employee found for employeeId=${assignment.employeeId}`);
            skipCount++;
            continue;
        }

        const shift = await db.collection('shifts').findOne(
            { shiftId: assignment.shiftId }
        );
        if (shift === null) {
            console.log(`  SKIP: No shift found for shiftId=${assignment.shiftId}`);
            skipCount++;
            continue;
        }

        await db.collection('shifts').updateOne(
            { _id: shift._id },
            { $addToSet: { employees: employee._id } }
        );

        successCount++;
    }

    console.log(`Embedded ${successCount} ObjectId(s). Skipped ${skipCount}.`);
}

/**
 * Step 3: Remove old string id fields and drop the assignments collection.
 *
 * Shell equivalents (Compass):
 *   db.employees.updateMany({}, { $unset: { employeeId: "" } })
 *   db.shifts.updateMany({}, { $unset: { shiftId: "" } })
 *   db.assignments.drop()
 *
 * @returns {Promise<void>}
 */
async function step3_removeOldFields() {
    console.log('\n--- Step 3: Removing old fields and dropping assignments ---');

    const empResult = await db.collection('employees').updateMany(
        { employeeId: { $exists: true } },
        { $unset: { employeeId: '' } }
    );
    console.log(`Removed employeeId from ${empResult.modifiedCount} employee(s).`);

    const shiftResult = await db.collection('shifts').updateMany(
        { shiftId: { $exists: true } },
        { $unset: { shiftId: '' } }
    );
    console.log(`Removed shiftId from ${shiftResult.modifiedCount} shift(s).`);

    const cols = await db.listCollections({ name: 'assignments' }).toArray();
    if (cols.length > 0) {
        await db.collection('assignments').drop();
        console.log('Dropped assignments collection.');
    } else {
        console.log('assignments collection not found, skipping.');
    }
}

/**
 * Verify migrated data 
 * @returns {Promise<void>}
 */
async function verify() {
    console.log('\n--- Verification ---');

    const employees = await db.collection('employees').find({}).toArray();
    console.log(`Employees (${employees.length}):`);
    for (let i = 0; i < employees.length; i++) {
        console.log(`  _id=${employees[i]._id}  name=${employees[i].name}  employeeId=${employees[i].employeeId || 'REMOVED'}`);
    }

    const shifts = await db.collection('shifts').find({}).toArray();
    console.log(`Shifts (${shifts.length}):`);
    for (let i = 0; i < shifts.length; i++) {
        console.log(`  _id=${shifts[i]._id}  date=${shifts[i].date}  employees=[${shifts[i].employees}]`);
    }
}

/**
 * runs all migration steps in mentioned order .
 * @returns {Promise<void>}
 */
async function main() {
    await connect();
    await step1_addEmptyEmployeesArray();
    await step2_embedEmployeesInShifts();
    await step3_removeOldFields();
    await verify();
    await disconnect();
    console.log('\nMigration complete.');
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

