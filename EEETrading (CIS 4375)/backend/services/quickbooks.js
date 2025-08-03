const QuickBooks = require('node-quickbooks');
const { getConnection } = require('./db');
const axios = require('axios');

async function getQuickBooksClient() {
    let connection;
    try {
        connection = await getConnection();
        
        // Get latest tokens
        const [tokens] = await connection.execute(
            'SELECT * FROM quickbooks_tokens ORDER BY created_at DESC LIMIT 1'
        );

        if (!tokens || tokens.length === 0) {
            throw new Error('No QuickBooks tokens found');
        }

        const token = tokens[0];
        const tokenCreatedAt = new Date(token.created_at);
        const now = new Date();
        const tokenAge = (now - tokenCreatedAt) / 1000; // Convert to seconds

        // If token is expired or close to expiring, refresh it
        if (tokenAge > (token.expires_in - 300)) { // Refresh if less than 5 minutes left
            console.log('Token expired or expiring soon, refreshing...');
            await refreshQuickBooksToken();
            // Get new tokens after refresh
            const [newTokens] = await connection.execute(
                'SELECT * FROM quickbooks_tokens ORDER BY created_at DESC LIMIT 1'
            );
            token = newTokens[0];
        }

        return new QuickBooks(
            process.env.QUICKBOOKS_CLIENT_ID,
            process.env.QUICKBOOKS_CLIENT_SECRET,
            token.access_token,
            false,
            token.realm_id,
            process.env.QUICKBOOKS_ENVIRONMENT === 'sandbox',
            true,
            null,
            '2.0',
            token.refresh_token
        );
    } finally {
        if (connection) {
            await connection.release();
        }
    }
}

async function refreshQuickBooksToken() {
    let connection;
    try {
        connection = await getConnection();
        
        // Get current tokens
        const [tokens] = await connection.execute(
            'SELECT * FROM quickbooks_tokens ORDER BY created_at DESC LIMIT 1'
        );

        if (!tokens || tokens.length === 0) {
            throw new Error('No tokens found to refresh');
        }

        const token = tokens[0];
        
        // Exchange refresh token for new access token
        const response = await axios.post('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', 
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token.refresh_token
            }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(
                    process.env.QUICKBOOKS_CLIENT_ID + ':' + process.env.QUICKBOOKS_CLIENT_SECRET
                ).toString('base64')
            }
        });

        // Store new tokens
        await connection.execute(`
            INSERT INTO quickbooks_tokens (
                access_token,
                refresh_token,
                created_at,
                expires_in,
                realm_id
            ) VALUES (?, ?, NOW(), ?, ?)
        `, [
            response.data.access_token,
            response.data.refresh_token,
            response.data.expires_in,
            token.realm_id
        ]);

        return response.data;
    } finally {
        if (connection) {
            await connection.release();
        }
    }
}

module.exports = { 
    getQuickBooksClient,
    refreshQuickBooksToken
};
