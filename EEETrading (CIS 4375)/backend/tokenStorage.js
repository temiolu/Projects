const mysql = require('mysql2/promise');

async function storeTokens(access_token, refresh_token, realmId) {
  let connection;
  try {
    connection = await getConnection();
    console.log('Connected to database, attempting update...');
    const [result] = await connection.execute(
      'UPDATE quickbooks_tokens SET access_token = ?, refresh_token = ? WHERE company_id = ?',
      [access_token, refresh_token, realmId]
    );
    console.log('Update result:', result);

    if (result.affectedRows === 0) {
      console.log('No existing tokens found, attempting insert...');
      const [insertResult] = await connection.execute(
        'INSERT INTO quickbooks_tokens (access_token, refresh_token, company_id) VALUES (?, ?, ?)',
        [access_token, refresh_token, realmId]
      );
      console.log('Insert result:', insertResult);
    }
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = { storeTokens };