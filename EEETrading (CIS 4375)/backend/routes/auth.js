const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool, getConnection } = require('../services/db');
const axios = require('axios');
const { getQuickBooksClient } = require('../services/quickbooks');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

console.log('Initializing OAuth with:');
console.log('Client ID:', process.env.QUICKBOOKS_CLIENT_ID);
console.log('Redirect URI:', process.env.QUICKBOOKS_REDIRECT_URI);
console.log('Environment:', process.env.QUICKBOOKS_ENVIRONMENT);

// Start OAuth flow
router.get('/quickbooks/connect', (req, res) => {
    try {
        // Generate a random state value
        const state = Math.random().toString(36).substring(7);
        
        // Store state in session
        req.session = req.session || {};
        req.session.quickbooksState = state;
        
        const authUri = `https://appcenter.intuit.com/connect/oauth2?client_id=${process.env.QUICKBOOKS_CLIENT_ID}&redirect_uri=${process.env.QUICKBOOKS_REDIRECT_URI}&response_type=code&scope=com.intuit.quickbooks.accounting&state=${state}`;
        
        console.log('Generated auth URI with state:', state);
        res.redirect(authUri);
    } catch (error) {
        console.error('Connect endpoint error:', error);
        res.status(500).json({
            error: 'Failed to generate auth URI',
            details: error.message
        });
    }
});

// Nodemailer configuration for sending emails with RESET_EMAIL_USER
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.RESET_EMAIL_USER,
        pass: process.env.RESET_EMAIL_PASS,
    },
});

router.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
  
    try {
      const connection = await getConnection();
      const [user] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
  
      if (user.length === 0) {
        await connection.release();
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      const token = jwt.sign({ userId: user[0].id }, process.env.SECRETKEY, { expiresIn: '1h' });
      const resetLink = `http://localhost:3001/auth/reset-password?token=${token}`;
  
      const mailOptions = {
        from: process.env.RESET_EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        text: `Please use the following link to reset your password: ${resetLink}`,
      };
  
      await transporter.sendMail(mailOptions);
      await connection.release();
  
      return res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
  
    } catch (error) {
      console.error('Error in password reset request:', error);
      return res.status(500).json({ success: false, message: 'Error in password reset request' });
    }
  });

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRETKEY);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const connection = await getConnection();
        await connection.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, decoded.userId]);
        await connection.release();

        return res.status(200).json({ success: true, message: 'Password reset successful' });
        
    } catch (error) {
        console.error('Password reset error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ success: false, message: 'Token has expired' });
        }
        return res.status(500).json({ success: false, message: 'Password reset failed' });
    }
});

// Route to render the password reset form with the token
router.get('/reset-password', (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).send('Token is required');
    }
    res.render('pages/reset-password', { token });
});


// Registration route
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validate inputs
    if (!email || !password || !username) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const connection = await getConnection();

        // Check if the user already exists
        const [existingUser] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        await connection.execute(
            'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
            [email, hashedPassword, username]
        );
        await connection.release();

        // Send confirmation email
        const mailOptions = {
            from: process.env.RESET_EMAIL_USER,
            to: email,
            subject: 'Registration Confirmation',
            text: `Hello ${username},\n\nThank you for registering with EEETrading LLC! Your account has been successfully created.\n\nBest regards,\nEEETrading LLC`,
        };

        console.log('Attempting to send confirmation email...');  // Debug log

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);  // Log the error if it occurs
            } else {
                console.log('Email sent:', info.response);  // Log success response
            }
        });

        return res.status(201).json({ success: true, message: 'User registered successfully' });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

// OAuth callback
router.get('/quickbooks/callback', async (req, res) => {
    try {
        console.log('Received callback with URL:', req.url);
        console.log('Query parameters:', req.query);
        
        const { code, realmId, state } = req.query;
        
        if (!code) {
            throw new Error('No authorization code received');
        }

        // Define token URL
        const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
        
        // Create form data with all required parameters
        const data = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI
        });

        // Create Basic auth header
        const auth = Buffer.from(
            `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
        ).toString('base64');

        console.log('Token exchange parameters:', {
            grantType: 'authorization_code',
            code: code.substring(0, 10) + '...',  // Log partial code for security
            redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
            clientIdPresent: !!process.env.QUICKBOOKS_CLIENT_ID,
            clientSecretPresent: !!process.env.QUICKBOOKS_CLIENT_SECRET
        });

        const response = await axios.post(tokenUrl, data, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });

        console.log('Token exchange response:', {
            status: response.status,
            hasAccessToken: !!response.data.access_token,
            hasRefreshToken: !!response.data.refresh_token,
            expiresIn: response.data.expires_in,
            tokenType: response.data.token_type
        });

        const tokens = response.data;

        // Store tokens in database
        try {
            const connection = await getConnection();
            console.log('Database connection established');

            await connection.execute(`
                INSERT INTO quickbooks_tokens (
                    access_token,
                    refresh_token,
                    created_at,
                    expires_in,
                    realm_id
                ) VALUES (?, ?, NOW(), ?, ?)
            `, [
                tokens.access_token,
                tokens.refresh_token,
                tokens.expires_in,
                realmId
            ]);

            console.log('Tokens stored in database');
            await connection.release();
            console.log('Database connection released');

            // Now try to verify the tokens were stored
            const verifyConnection = await getConnection();
            const [storedTokens] = await verifyConnection.execute(
                'SELECT * FROM quickbooks_tokens ORDER BY created_at DESC LIMIT 1'
            );
            console.log('Verification of stored tokens:', {
                found: storedTokens.length > 0,
                hasAccessToken: !!storedTokens[0]?.access_token,
                hasRefreshToken: !!storedTokens[0]?.refresh_token,
                realmId: storedTokens[0]?.realm_id
            });
            await verifyConnection.release();

        } catch (dbError) {
            console.error('Database error:', dbError);
            throw new Error('Failed to store tokens in database: ' + dbError.message);
        }

        res.send(`
            <html>
                <body>
                    <h1>QuickBooks connected successfully!</h1>
                    <p>You can close this window.</p>
                    <script>
                        window.opener && window.opener.postMessage('quickbooks-connected', '*');
                        setTimeout(() => window.close(), 3000);
                    </script>
                </body>
            </html>
        `);

    } catch (error) {
        console.error('OAuth error:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers
        });
        
        res.status(500).send(`
            <html>
                <body>
                    <h1>Error connecting to QuickBooks</h1>
                    <p>${error.message}</p>
                    <p>${error.response?.data?.error_description || ''}</p>
                    <p>Please try again.</p>
                    <script>
                        setTimeout(() => window.close(), 5000);
                    </script>
                </body>
            </html>
        `);
    }
});

// Status check endpoint
router.get('/quickbooks/status', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [tokens] = await connection.execute(
            'SELECT created_at, expires_in, access_token, company_id FROM quickbooks_tokens ORDER BY created_at DESC LIMIT 1'
        );

        if (tokens.length === 0) {
            res.json({
                connected: false,
                message: 'No QuickBooks connection found',
                debug: 'No tokens found in database'
            });
            return;
        }

        const token = tokens[0];
        const tokenCreatedAt = new Date(token.created_at);
        const now = new Date();
        const tokenAge = (now - tokenCreatedAt) / 1000; // Convert to seconds
        const expiresIn = token.expires_in;
        const isValid = tokenAge < expiresIn;

        res.json({
            connected: isValid,
            message: isValid ? 'Connected to QuickBooks' : 'QuickBooks token expired',
            expires_in: Math.max(0, expiresIn - tokenAge),
            debug: {
                tokenCreatedAt: tokenCreatedAt.toISOString(),
                currentTime: now.toISOString(),
                tokenAge: tokenAge,
                expiresIn: expiresIn,
                hasAccessToken: !!token.access_token,
                companyId: token.company_id || 'Not set'
            }
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            connected: false,
            message: 'Error checking QuickBooks status',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Test endpoint
router.get('/quickbooks/test', async (req, res) => {
    try {
        console.log('Initializing QuickBooks client...');
        const qbo = await getQuickBooksClient();
        console.log('QuickBooks client initialized');

        qbo.getCompanyInfo(qbo.realmId, (err, companyInfo) => {
            if (err) {
                console.error('Error getting company info:', err);
                return res.status(500).json({
                    error: 'Failed to get company info',
                    details: err.message
                });
            }

            console.log('Successfully retrieved company info');
            return res.json({
                success: true,
                companyInfo: {
                    companyName: companyInfo.CompanyName,
                    legalName: companyInfo.LegalName,
                    country: companyInfo.Country,
                    startDate: companyInfo.CompanyStartDate,
                    industry: companyInfo.NameValue.find(nv => nv.Name === 'QBOIndustryType')?.Value
                }
            });
        });
    } catch (error) {
        console.error('Test endpoint error:', error);
        return res.status(500).json({
            error: 'Failed to initialize QuickBooks client',
            details: error.message
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const connection = await getConnection();
        const [users] = await connection.execute(
            'SELECT id, email, password, role FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const userData = users[0];

        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            { userId: userData.id, email: userData.email, role: userData.role },
            process.env.SECRETKEY,
            { expiresIn: "24h" }
        );

        await connection.release();

        return res.status(200).json({
            success: true,
            token,
            user: { id: userData.id, email: userData.email, role: userData.role }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

module.exports = router;
