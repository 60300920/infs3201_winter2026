'use strict';

const express = require('express');
const { engine } = require('express-handlebars');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const business = require('./business');
const persistence = require('./persistence');

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.urlencoded({ extended: false }));

// Create uploads directory if it doesn't exist
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.pdf';
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed.'));
        }
        cb(null, true);
    }
});

const COOKIE_NAME = 'sessionId';

/**
 * Read the sessionId value out of the Cookie header.
 * @param {Object} req
 * @returns {string|null}
 */
function parseCookieSessionId(req) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const parts = cookies[i].trim().split('=');
        if (parts[0] === COOKIE_NAME) {
            return parts[1];
        }
    }

    return null;
}

/**
 * Logs every request to the security_logs collection.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
app.use(async (req, res, next) => {
    try {
        const sessionId = parseCookieSessionId(req);
        let username = null;

        if (sessionId) {
            const session = await business.getSession(sessionId);
            if (session) {
                username = session.username;
            }
        }

        await persistence.logSecurityEvent({
            timestamp: new Date(),
            username: username,
            url: req.originalUrl,
            method: req.method
        });
    } catch (err) {
        console.error('Security log error:', err);
    }

    next();
});



/**
 * Blocks access to all routes except /login, /logout, and /verify-2fa if no valid session.
 * Redirects unauthenticated users to /login.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
async function requireAuth(req, res, next) {
    if (req.path === '/login' || req.path === '/logout' || req.path === '/verify-2fa') {
        return next();
    }

    const sessionId = parseCookieSessionId(req);
    const session = await business.getSession(sessionId);

    if (session === null) {
        return res.redirect('/login?message=Please+log+in+to+continue');
    }

    req.session = session;
    next();
}

app.use(requireAuth);

/**
 * Login page - GET.
 * @param {Object} req
 * @param {Object} res
 */
app.get('/login', (req, res) => {
    const message = req.query.message || null;
    res.render('login', { message: message });
});

/**
 * Login - POST.
 * Validates credentials then redirects to 2FA page.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
app.post('/login', async (req, res) => {
    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();

    const result = await business.validateLogin(username, password);

    if (result.success === false) {
        return res.redirect('/login?message=' + encodeURIComponent(result.message));
    }

    // Send 2FA code to user's email
    const email = result.user.email || username + '@example.com';
    await business.create2FACode(username, email);

    res.render('twofa', { username: username, message: null });
});

/**
 * 2FA verification - POST.
 * Validates the 2FA code and creates session if correct.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
app.post('/verify-2fa', async (req, res) => {
    const username = (req.body.username || '').trim();
    const code = (req.body.code || '').trim();

    if (username === '' || code === '') {
        return res.render('twofa', { username: username, message: 'Please enter your verification code.' });
    }

    const valid = await business.validate2FACode(username, code);

    if (valid === false) {
        return res.render('twofa', { username: username, message: 'Invalid or expired code. Please try again.' });
    }

    // Code is valid - create session
    const sessionId = await business.createSession(username);

    res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=${sessionId}; Max-Age=${5 * 60}; HttpOnly; Path=/`
    );

    res.redirect('/');
});

/**
 * Logout - GET.
 * Deletes the session from the database and clears the cookie.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
app.get('/logout', async (req, res) => {
    const sessionId = parseCookieSessionId(req);

    if (sessionId) {
        await business.destroySession(sessionId);
    }

    res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=; Max-Age=0; HttpOnly; Path=/`
    );

    res.redirect('/login?message=You+have+been+logged+out');
});


/**
 * Home page - list of all employees.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
app.get('/', async (req, res) => {
    const employees = await business.getAllEmployees();
    res.render('home', { employees: employees });
});

/**
 * Employee details page.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
app.get('/employee/:id', async (req, res) => {
    const empId = req.params.id;

    const employee = await business.getEmployeeById(empId);
    if (employee === null) {
        res.send('Employee not found');
        return;
    }

    const schedule = await business.getEmployeeSchedule(empId);

    // Sort shifts by date then start time
    for (let i = 0; i < schedule.length - 1; i++) {
        for (let j = 0; j < schedule.length - i - 1; j++) {
            const a = schedule[j].date + schedule[j].startTime;
            const b = schedule[j + 1].date + schedule[j + 1].startTime;
            if (a > b) {
                const temp = schedule[j];
                schedule[j] = schedule[j + 1];
                schedule[j + 1] = temp;
            }
        }
    }

    for (let i = 0; i < schedule.length; i++) {
        const hour = parseInt(schedule[i].startTime.split(':')[0]);
        if (hour < 12) {
            schedule[i].isMorning = true;
        }
    }

    const documents = await business.getEmployeeDocuments(empId);
    const docCount = documents.length;

    res.render('employee', {
        employee: employee,
        schedule: schedule,
        documents: documents,
        canUpload: docCount < 5
    });
});

/**
 * Edit employee form - GET.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
app.get('/employee/:id/edit', async (req, res) => {
    const empId = req.params.id;

    const employee = await business.getEmployeeById(empId);
    if (employee === null) {
        res.send('Employee not found');
        return;
    }

    res.render('edit', { employee: employee });
});

/**
 * Edit employee form - POST.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
app.post('/employee/:id/edit', async (req, res) => {
    const empId = req.params.id;

    const name = (req.body.name || '').trim();
    const phone = (req.body.phone || '').trim();

    if (name === '') {
        res.send('Name cannot be empty');
        return;
    }

    const phoneRegex = /^\d{4}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
        res.send('Phone number must be in the format ####-####');
        return;
    }

    await persistence.updateEmployee(empId, name, phone);

    res.redirect('/');
});

/**
 * Upload a document for an employee - POST.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
app.post('/employee/:id/upload', function (req, res) {
    const empId = req.params.id;

    upload.single('document')(req, res, async function (err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.send('File must be less than 2MB.');
                return;
            }
            res.send(err.message);
            return;
        }

        if (!req.file) {
            res.send('Please select a file to upload.');
            return;
        }

        const employee = await business.getEmployeeById(empId);
        if (employee === null) {
            res.send('Employee not found');
            return;
        }

        const docCount = await business.getDocumentCount(empId);
        if (docCount >= 5) {
            // Remove the uploaded file since we can't save it
            fs.unlinkSync(req.file.path);
            res.send('Maximum of 5 documents allowed per employee.');
            return;
        }

        await business.saveDocumentRecord(empId, req.file.originalname, req.file.filename);

        res.redirect('/employee/' + empId);
    });
});

/**
 * Download a document - GET.
 * Protected so only logged-in users can access documents.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
app.get('/document/:id', async (req, res) => {
    const doc = await business.getDocumentById(req.params.id);
    if (doc === null) {
        res.send('Document not found');
        return;
    }

    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (!fs.existsSync(filePath)) {
        res.send('File not found on server');
        return;
    }

    res.download(filePath, doc.originalName);
});

/**
 * Connects to MongoDB then starts the server.
 * @returns {Promise<void>}
 */
async function main() {
    await persistence.connect();
    app.listen(3000, () => {
        console.log('Server running on http://localhost:3000');
    });
}

main();