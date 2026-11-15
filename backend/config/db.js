const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123', // Replace with your MySQL root password if different
    database: process.env.DB_NAME || 'helpdesk_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Test the connection
promisePool.query('SELECT 1')
    .then(() => console.log('Database connected successfully to helpdesk_db!'))
    .catch(err => console.error('Database connection failed:', err.message));

module.exports = promisePool;