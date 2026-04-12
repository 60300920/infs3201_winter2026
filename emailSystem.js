'use strict';

/**
 * Sends an email using console.log
 * this function provides the same interface as real email
 * outputs to console for testing.
 * @param {string} to
 * @param {string} subject
 * @param {string} body
 * @returns {Promise<void>}
 */
async function sendEmail(to, subject, body) {
    console.log('\n========== EMAIL ==========');
    console.log('To:      ' + to);
    console.log('Subject: ' + subject);
    console.log('Body:    ' + body);
    console.log('===========================\n');
}

/**
 * Send a 2FA verification code to a user.
 * @param {string} email
 * @param {string} code
 * @returns {Promise<void>}
 */
async function send2FACode(email, code) {
    await sendEmail(
        email,
        'Your Login Verification Code',
        'Your 2FA code is: ' + code + '\nThis code expires in 3 minutes.'
    );
}

/**
 * suspicious  activity notification
 * @param {string} emai
 * @param {string} username
 * @returns {Promise<void>}
 */
async function sendSuspiciousActivityAlert(email, username) {
    await sendEmail(
        email,
        'Suspicious Activity Detected',
        'There have been multiple failed login attempts on your account (' + username + '). If this was not you, please secure your account immediately.'
    );
}

/**
 * Send notification for account look
 * @param {string} email 
 * @param {string} username 
 * @returns {Promise<void>}
 */
async function sendAccountLockedAlert(email, username) {
    await sendEmail(
        email,
        'Account Locked',
        'Your account (' + username + ') has been locked due to too many failed login attempts. Please contact an administrator to unlock your account.'
    );
}

module.exports = {
    sendEmail,
    send2FACode,
    sendSuspiciousActivityAlert,
    sendAccountLockedAlert
};