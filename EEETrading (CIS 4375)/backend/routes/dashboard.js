const express = require('express');
const router = express.Router();
const { getQuickBooksClient } = require('../services/quickbooks');

router.get('/data', async (req, res) => {
  try {
    const qbo = await getQuickBooksClient();
    
    // Fetch low stock items, recent invoices, and total sales
    // ... (implementation details as previously discussed)

    res.json({
      lowStockItems,
      recentInvoices,
      totalSales
    });
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/quickbooks-summary', async (req, res) => {
  try {
    const qbo = await getQuickBooksClient();
    
    // Get recent invoices
    qbo.findInvoices([
      { field: 'MetaData.CreateTime', value: '>', operator: 'AFTER' }
    ], (err, invoices) => {
      if (err) {
        console.error('Error fetching invoices:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
      } else {
        res.json({
          success: true,
          recentInvoices: invoices,
          totalSales: invoices.reduce((sum, inv) => sum + inv.TotalAmt, 0)
        });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize QuickBooks client' });
  }
});

module.exports = router;
