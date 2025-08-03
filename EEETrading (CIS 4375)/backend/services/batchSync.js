const cron = require('node-cron');
const { getConnection } = require('./db');
const { syncItemToQuickBooks, updateSyncTimestamp } = require('./sync');

let isSyncRunning = false;

async function batchUpdateInventory(updates) {
    const connection = await getConnection();
    const results = {
        success: [],
        errors: []
    };

    try {
        await connection.beginTransaction();

        for (const update of updates) {
            try {
                await connection.execute(
                    'UPDATE inventory SET inventory_size = ? WHERE product_id = ?',
                    [update.quantity, update.product_id]
                );

                const [items] = await connection.execute(
                    'SELECT * FROM inventory WHERE product_id = ?',
                    [update.product_id]
                );

                if (items.length > 0) {
                    await syncItemToQuickBooks(items[0]);
                    await updateSyncTimestamp(update.product_id);
                    
                    results.success.push({
                        product_id: update.product_id,
                        new_quantity: update.quantity
                    });
                }
            } catch (error) {
                results.errors.push({
                    product_id: update.product_id,
                    error: error.message
                });
            }
        }

        await connection.commit();
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.end();
    }

    return results;
}

async function periodicSync() {
    if (isSyncRunning) {
        console.log('Sync already in progress, skipping...');
        return;
    }

    isSyncRunning = true;
    console.log('Starting periodic sync:', new Date().toISOString());

    try {
        const connection = await getConnection();
        const [items] = await connection.execute(`
            SELECT * FROM inventory 
            WHERE last_sync < DATE_SUB(NOW(), INTERVAL 1 HOUR)
            OR last_sync IS NULL
        `);

        const results = {
            success: [],
            errors: []
        };

        for (const item of items) {
            try {
                await syncItemToQuickBooks(item);
                await updateSyncTimestamp(item.product_id);
                results.success.push(item.product_id);
            } catch (error) {
                results.errors.push({
                    product_id: item.product_id,
                    error: error.message
                });
            }
        }

        await connection.end();
        console.log('Periodic sync completed:', {
            successes: results.success.length,
            errors: results.errors.length
        });

    } catch (error) {
        console.error('Error in periodic sync:', error);
    } finally {
        isSyncRunning = false;
    }
}

function startPeriodicSync() {
    // Run at the start of every hour (0 * * * *)
    cron.schedule('0 * * * *', () => {
        periodicSync().catch(console.error);
    });
    console.log('Periodic sync scheduled - running every hour at :00');
}

module.exports = {
    batchUpdateInventory,
    startPeriodicSync,
    periodicSync
};
