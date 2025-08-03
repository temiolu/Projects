const mysql = require('mysql2/promise');

// Log database configuration (without sensitive data)
console.log('Database Configuration:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const getConnection = async () => {
    return await pool.getConnection();
};

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database connection successful');
        connection.release();
    } catch (error) {
        console.error('Database connection error:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            error: error.message
        });
        throw error;
    }
};

// Test connection on startup
testConnection();

const query = async (sql, params = []) => {
    try {
        // Use query instead of execute for better compatibility
        const [results] = await pool.query(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

module.exports = {
    query,
    pool,
    getConnection
};
