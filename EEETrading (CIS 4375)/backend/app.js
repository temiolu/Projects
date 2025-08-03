require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { pool } = require('./services/db');
const { initializeAutomaticSync } = require('./services/sync');
const session = require('express-session');

// Import routes
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const invoiceRoutes = require('./routes/invoices');
const userRoutes = require('./routes/userData');

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:3001', credentials: true }));  // Updated CORS configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add database pool to request
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// Add session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true in production with HTTPS
}));

// Register routes
app.use('/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);

// Initialize automatic sync
initializeAutomaticSync();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: err.message
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await pool.end();
        console.log('Database pool closed');
        process.exit(0);
    } catch (err) {
        console.error('Error closing pool:', err);
        process.exit(1);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
