const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();
const { getQuickBooksClient } = require("./services/quickbooks");
const OAuthClient = require("intuit-oauth");
const QuickBooks = require("node-quickbooks");
const { storeTokens } = require("./tokenStorage");
const path = require("path");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Remove the ssl configuration
});

// Test database connection
pool
  .getConnection()
  .then((connection) => {
    console.log("Database connection successful!");
    connection.release();
  })
  .catch((err) => {
    console.error("Database Connection Error:", err);
    if (err.code === "ECONNREFUSED") {
      console.error(
        "Make sure your AWS RDS instance is running and accessible, and the connection details in .env are correct."
      );
    }
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("Access denied. Check your RDS username and password.");
    }
    if (err.code === "ETIMEDOUT") {
      console.error(
        "Connection timed out. Check your VPC and security group settings in AWS."
      );
    }
  });
// Make the pool available throughout the app
app.set("db", pool);

// Basic CRUD function
const crudOperation = async (sql, params) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("Error executing query", error);
    throw error;
  }
};

// API status check route
app.get("/", (req, res) => {
  res.json({ status: "API is running" });
});

// Storefront route
app.get("/api/products", async (req, res) => {
  try {
    const products = await crudOperation("SELECT * FROM inventory");
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error });
  }
});

// Assuming you are using Express for the route
app.get("/api/products/:product_id", async (req, res) => {
  const { product_id } = req.params; // Extract product_id from request parameters

  try {
    const query = "SELECT * FROM inventory WHERE product_id = ?";
    const products = await crudOperation(query, [product_id]); // Pass product_id as a parameter
    res.json(products);
    console.log(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error });
  }
});

// Inventory management route (protected, only for owners)
app.get("/api/inventory", async (req, res) => {
  // TODO: Add authentication middleware to ensure only owners can access this
  try {
    const inventory = await crudOperation(
      "SELECT * FROM inventory JOIN products ON inventory.product_id = products.id"
    );
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Error fetching inventory", error });
  }
});

// Invoice management route (protected, only for owners)
app.get("/api/invoices", async (req, res) => {
  // TODO: Add authentication middleware to ensure only owners can access this
  try {
    const invoices = await crudOperation("SELECT * FROM invoices");
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoices", error });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// QuickBooks authentication routes
const oauthClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
  environment: process.env.QUICKBOOKS_ENVIRONMENT,
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
});

app.get("/quickbooks/auth", (req, res) => {
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
  });
  res.redirect(authUri);
});

app.get("/quickbooks/callback", async (req, res) => {
  try {
    const authResponse = await oauthClient.createToken(req.url);
    const token = authResponse.getJson();

    // The realmId is the Company ID
    const companyId = token.realmId;

    console.log("Company ID (Realm ID):", companyId);

    // Store these tokens and the companyId securely (e.g., in your database)
    await storeTokens(token.access_token, token.refresh_token, companyId);

    // You might want to store the companyId in your session or database here

    res.send("QuickBooks connected successfully!");
  } catch (error) {
    console.error("Error during QuickBooks authentication:", error);
    res.status(500).send("Authentication failed");
  }
});

app.use("/api/dashboard", dashboardRoutes);

module.exports = app;
