# Assignment 4 - Employee Scheduling System

## Test Credentials

| Username | Password    |
|----------|-------------|
| admin    | password123 |
| alice    | test456     |

## How to Run

1. Install all the required dependencies:
   npm install

2. if npm install does not work, run the following command and repeat step 1
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

2. Run the database migration (one time only):
   node transform_db.js

3. Start the server:
   node app.js

4. Visit http://localhost:3000

## Notes
- Every Sessions will expire after 5 minutes of inactivity
- Revisisting the page extends the session by another 5 minutes
- All requests are logged to the security_log collection in MongoDB
- No express-session library is used