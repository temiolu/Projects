const mysql = require('mysql2/promise');
const { getQuickBooksClient } = require('./quickbooks');
const cron = require('node-cron');
const eventEmitter = require('./events');
const { getConnection } = require('./db');

// Track sync state
let isSyncRunning = false;

async function getQuickBooksItem(qbo, itemId) {
    return new Promise((resolve, reject) => {
        qbo.getItem(itemId, (err, item) => {
            if (err) reject(err);
            else resolve(item);
        });
    });
}

async function syncItemToQuickBooks(item) {
    try {
        const qbo = await getQuickBooksClient();
        
        if (item.quickbooks_item_id) {
            const qbItem = await getQuickBooksItem(qbo, item.quickbooks_item_id);
            
            const itemData = {
                Id: item.quickbooks_item_id,
                SyncToken: qbItem.SyncToken,
                Name: item.product_name,
                Type: 'Inventory',
                TrackQtyOnHand: true,
                QtyOnHand: item.inventory_size,
                Description: item.description,
                PurchaseCost: parseFloat(item.cost),
                IncomeAccountRef: {
                    value: "128",
                    name: "Sales of Product Income"
                },
                AssetAccountRef: {
                    value: "130",
                    name: "Inventory Asset"
                },
                ExpenseAccountRef: {
                    value: "129",
                    name: "Cost of Goods Sold"
                }
            };

            return new Promise((resolve, reject) => {
                qbo.updateItem(itemData, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        }
    } catch (error) {
        console.error(`Error syncing item ${item.product_name}:`, error);
        throw error;
    }
}

async function automaticSync() {
    let connection;
    try {
        connection = await getConnection();
        
        // Get items that need syncing
        const [items] = await connection.execute(`
            SELECT * FROM inventory 
            WHERE last_sync < DATE_SUB(NOW(), INTERVAL 1 HOUR)
            OR last_sync IS NULL
        `);

        if (items.length === 0) {
            console.log('No items need syncing');
            return;
        }

        console.log(`Syncing ${items.length} items with QuickBooks`);
        const qbo = await getQuickBooksClient();

        for (const item of items) {
            try {
                await syncItemToQuickBooks(qbo, item);
                
                // Update last_sync timestamp
                await connection.execute(
                    'UPDATE inventory SET last_sync = NOW() WHERE product_id = ?',
                    [item.product_id]
                );

                console.log(`Synced item ${item.product_id}`);
            } catch (error) {
                console.error(`Error syncing item ${item.product_id}:`, error);
            }
        }

    } catch (error) {
        console.error('Error in automatic sync:', error);
    } finally {
        if (connection) {
            await connection.release();
        }
    }
}

// Initialize automatic sync
function initializeAutomaticSync() {
    // Run every hour
    cron.schedule('0 * * * *', () => {
        automaticSync().catch(console.error);
    });

    // Run on inventory changes (after a 5-minute delay to batch changes)
    let syncTimeout;
    eventEmitter.on('inventoryChanged', () => {
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            automaticSync().catch(console.error);
        }, 5 * 60 * 1000); // 5 minutes
    });

    console.log('Automatic sync initialized - running hourly and on inventory changes');
}

async function resetChangeFlag(itemId) {
    let connection;
    try {
        connection = await getConnection();
        await connection.execute(
            'UPDATE inventory SET inventory_size_changed = FALSE WHERE quickbooks_item_id = ?',
            [itemId]
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = {
    getQuickBooksItem,
    syncItemToQuickBooks,
    automaticSync,
    initializeAutomaticSync,
    resetChangeFlag
};
