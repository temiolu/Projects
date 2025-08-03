require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createTestUser() {
  try {
    // Create hashed password
    const password = "password123"; // or whatever password you want
    const hashedPassword = await bcrypt.hash(password, 10);

    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Delete existing test user if exists
    await connection.execute(
      'DELETE FROM users WHERE email = ?',
      ['test@example.com']
    );

    // Insert new test user
    const [result] = await connection.execute(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      ['test@example.com', hashedPassword, 'admin']
    );

    console.log('Test user created successfully');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    console.log('Role: admin');

    await connection.end();
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser(); 