const mysql = require('mysql2/promise');
const { broadcastInventoryUpdate } = require('./websocket');
const eventEmitter = require('./events');

async function updateInventoryQuantity(itemId, newQuantity) {
    let connection;
    try {
        connection = await getConnection();
        
        // Get current quantity
        const [currentItem] = await connection.execute(
            'SELECT quantity FROM inventory WHERE quickbooks_item_id = ?',
            [itemId]
        );

        // Update inventory quantity
        await connection.execute(
            `UPDATE inventory 
             SET quantity = ?, 
                 inventory_size_changed = TRUE 
             WHERE quickbooks_item_id = ?`,
            [newQuantity, itemId]
        );

        // Fetch updated item for broadcasting
        const [rows] = await connection.execute(
            'SELECT * FROM inventory WHERE quickbooks_item_id = ?',
            [itemId]
        );

        if (rows.length > 0) {
            broadcastInventoryUpdate(rows[0]);
            eventEmitter.emit('inventoryChanged', rows[0]);
        }

        return rows[0];
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

async function getInventoryItem(itemId) {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute(
            'SELECT * FROM inventory WHERE quickbooks_item_id = ?',
            [itemId]
        );
        return rows[0];
    } catch (error) {
        console.error(`Error getting inventory item ${itemId}:`, error);
        throw error;
    } finally {
        await connection.end();
    }
}

async function getAllInventory() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute('SELECT * FROM inventory');
        return rows;
    } finally {
        await connection.end();
    }
}

module.exports = {
    updateInventoryQuantity,
    getInventoryItem,
    getAllInventory
};
