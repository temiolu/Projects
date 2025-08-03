const express = require('express');
const router = express.Router();
const { query } = require('../services/db');
const { authMiddleware } = require('../middleware/auth');
const { getQuickBooksClient } = require('../services/quickbooks');
const { sendInvoiceEmail } = require('../services/email');

// Create invoice
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const {
            customer_name,
            customer_email,
            items,
            notes
        } = req.body;

        // Calculate total amount
        const total_amount = items.reduce((total, item) => total + (item.quantity * item.price), 0);

        // Store in local database
        const result = await query(`
            INSERT INTO invoices (
                customer_name, 
                customer_email, 
                total_amount, 
                status,
                created_at,
                notes
            ) VALUES (?, ?, ?, ?, NOW(), ?)
        `, [
            customer_name,
            customer_email,
            total_amount,
            'PENDING',
            notes
        ]);

        // Send invoice email
        try {
            await sendInvoiceEmail(
                { 
                    id: result.insertId,
                    created_at: new Date(),
                    total_amount: total_amount
                },
                { 
                    name: customer_name, 
                    email: customer_email 
                },
                items
            );
        } catch (emailError) {
            console.error('Failed to send invoice email:', emailError);
            // Continue execution even if email fails
        }

        res.json({
            success: true,
            message: 'Invoice created and email sent successfully',
            invoice_id: result.insertId
        });

    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create invoice',
            error: error.message
        });
    }
});

// Get all invoices
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Parse pagination params
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        // Build WHERE clause
        let whereConditions = [];
        let params = [];

        // Add status filter
        if (req.query.status) {
            whereConditions.push('status = ?');
            params.push(req.query.status);
        }

        // Add customer name filter
        if (req.query.customer_name) {
            whereConditions.push('customer_name LIKE ?');
            params.push(`${req.query.customer_name}%`);
        }

        // Add date range filter
        if (req.query.start_date) {
            whereConditions.push('DATE(created_at) >= ?');
            params.push(req.query.start_date);
        }
        if (req.query.end_date) {
            whereConditions.push('DATE(created_at) <= ?');
            params.push(req.query.end_date);
        }

        // Construct WHERE clause
        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        // Build query
        const query_str = `
            SELECT 
                id,
                customer_name,
                customer_email,
                total_amount,
                status,
                created_at,
                notes
            FROM invoices 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        // Debug log
        console.log('Query:', query_str);
        console.log('Params:', params);

        // Execute query
        const invoices = await query(query_str, params);

        // Get total count with filters
        const countQuery = `SELECT COUNT(*) as total FROM invoices ${whereClause}`;
        const [countResult] = await query(countQuery, params);
        const total = countResult.total;

        res.json({
            success: true,
            data: invoices,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                total_pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices',
            error: error.message
        });
    }
});

// Get single invoice
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await query(
            'SELECT * FROM invoices WHERE id = ? OR quickbooks_invoice_id = ?',
            [id, id]
        );

        if (!invoice.length) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.json({
            success: true,
            data: invoice[0]
        });

    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoice',
            error: error.message
        });
    }
});

// Update invoice status
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['PENDING', 'PAID', 'CANCELLED'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        await query(
            'UPDATE invoices SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: 'Invoice status updated successfully'
        });

    } catch (error) {
        console.error('Error updating invoice status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice status',
            error: error.message
        });
    }
});

// Add this test route after your existing routes
router.post('/test-email', authMiddleware, async (req, res) => {
    try {
        const testInvoice = {
            id: 'TEST-001',
            created_at: new Date(),
            total_amount: 99.99
        };

        const testCustomer = {
            name: 'Test Customer',
            email: req.body.email // Email to send the test to
        };

        const testItems = [
            {
                name: 'Test Item 1',
                quantity: 2,
                price: 29.99
            },
            {
                name: 'Test Item 2',
                quantity: 1,
                price: 40.01
            }
        ];

        await sendInvoiceEmail(testInvoice, testCustomer, testItems);

        res.json({
            success: true,
            message: 'Test email sent successfully'
        });

    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
});

module.exports = router;
