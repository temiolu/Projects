const express = require("express");
const router = express.Router();
const {
  getQuickBooksClient,
  refreshQuickBooksToken,
} = require("../services/quickbooks");
const { authMiddleware } = require("../middleware/auth");
const mysql = require("mysql2/promise");
const { broadcastInventoryUpdate } = require("../services/websocket");
const {
  syncItemToQuickBooks,
  updateSyncTimestamp,
} = require("../services/sync");
const { batchUpdateInventory } = require("../services/batchSync");

// Fetch all inventory items from QuickBooks
router.get("/quickbooks-inventory", authMiddleware, async (req, res) => {
  try {
    console.log("Fetching QuickBooks inventory...");
    let qbo = await getQuickBooksClient();

    // Wrap the QuickBooks API call in a promise
    const getItems = () => {
      return new Promise((resolve, reject) => {
        qbo.findItems(
          {
            Active: true,
            Type: "Inventory",
          },
          (err, itemsResponse) => {
            if (err) {
              console.error("QuickBooks API Error:", {
                message: err.message || "Unknown error",
                fault: err.fault,
                intuit_tid: err.intuit_tid,
              });
              reject(err);
            } else {
              console.log(
                "QuickBooks Response:",
                JSON.stringify(itemsResponse, null, 2)
              );
              // Check if QueryResponse exists and contains Items
              const items = itemsResponse.QueryResponse?.Item || [];
              resolve(items);
            }
          }
        );
      });
    };

    try {
      const items = await getItems();
      console.log(`Found ${items.length} inventory items`);

      // Check if items is an array before mapping
      const inventoryItems = Array.isArray(items)
        ? items.map((item) => ({
            id: item.Id,
            name: item.Name,
            sku: item.Sku || "",
            quantity: item.QtyOnHand || 0,
            unitPrice: item.UnitPrice || 0,
            description: item.Description || "",
            category: item.Type || "Inventory",
          }))
        : [];

      res.json({
        success: true,
        count: inventoryItems.length,
        items: inventoryItems,
      });
    } catch (apiError) {
      // If it's an authentication error, try refreshing the token
      if (apiError.fault?.type === "AUTHENTICATION") {
        console.log("Authentication error - attempting token refresh...");
        await refreshQuickBooksToken();

        // Try again with new token
        qbo = await getQuickBooksClient();
        const items = await getItems();

        const inventoryItems = Array.isArray(items)
          ? items.map((item) => ({
              id: item.Id,
              name: item.Name,
              sku: item.Sku || "",
              quantity: item.QtyOnHand || 0,
              unitPrice: item.UnitPrice || 0,
              description: item.Description || "",
              category: item.Type || "Inventory",
            }))
          : [];

        res.json({
          success: true,
          count: inventoryItems.length,
          items: inventoryItems,
        });
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    console.error("Error in inventory endpoint:", error);
    res.status(500).json({
      error: "Failed to fetch inventory",
      details: error.message,
      type: error.fault?.type || "UNKNOWN",
    });
  }
});

//Specific Item in INventory ID
router.get("/quickbooks-inventory/:id", authMiddleware, async (req, res) => {
  const itemId = req.params.id; // Get the item ID from the URL

  try {
    console.log(`Fetching QuickBooks inventory item with ID: ${itemId}`);
    let qbo = await getQuickBooksClient();

    // Function to get a single item by ID
    const getItemById = () => {
      return new Promise((resolve, reject) => {
        qbo.getItem(itemId, (err, itemResponse) => {
          if (err) {
            console.error("QuickBooks API Error:", {
              message: err.message || "Unknown error",
              fault: err.fault,
              intuit_tid: err.intuit_tid,
            });
            reject(err);
          } else {
            console.log(
              "QuickBooks Response:",
              JSON.stringify(itemResponse, null, 2)
            );
            resolve(itemResponse);
          }
        });
      });
    };

    try {
      const item = await getItemById();

      // Check if the item was found
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      const inventoryItem = {
        id: item.Id,
        name: item.Name,
        sku: item.Sku || "",
        quantity: item.QtyOnHand || 0,
        unitPrice: item.UnitPrice || 0,
        description: item.Description || "",
        category: item.Type || "Inventory",
      };

      res.json({
        success: true,
        item: inventoryItem,
      });
    } catch (apiError) {
      // Handle any errors that may occur when fetching the item
      console.error("Error fetching item by ID:", apiError);
      res.status(500).json({
        error: "Failed to fetch item",
        details: apiError.message,
        type: apiError.fault?.type || "UNKNOWN",
      });
    }
  } catch (error) {
    console.error("Error in inventory item endpoint:", error);
    res.status(500).json({
      error: "Failed to fetch inventory item",
      details: error.message,
      type: error.fault?.type || "UNKNOWN",
    });
  }
});

//Images
router.get("/images", async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    // Fetch all image data
    const [imageData] = await connection.execute(
      "SELECT DISTINCT image_id, quickbooks_item_id FROM inventory WHERE image_id IS NOT NULL AND quickbooks_item_id IS NOT NULL"
    );
    if (!imageData.length) return res.status(404).json({ message: "No images found" });
    res.json(imageData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching images", error });
  } finally {
    connection.end();
  }
});

router.get("/image/:id", async (req, res) => {
  const { id } = req.params;
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const [imageData] = await connection.execute("SELECT image_id FROM inventory WHERE quickbooks_item_id = ?", [id]);
    if (!imageData.length) return res.status(404).json({ message: "Inventory not found" });
    res.json(imageData);
  } catch (error) {
    console.error(error);  
    res.status(500).json({ message: "Error fetching inventory", error });
  } finally { connection.end(); }
});




// Update local database inventory
async function updateLocalInventory(itemId, newQuantity) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await connection.execute(
      "UPDATE inventory SET quantity = ? WHERE quickbooks_item_id = ?",
      [newQuantity, itemId]
    );

    // Fetch updated item details
    const [rows] = await connection.execute(
      "SELECT * FROM inventory WHERE quickbooks_item_id = ?",
      [itemId]
    );

    if (rows.length > 0) {
      // Broadcast update to all connected clients
      broadcastInventoryUpdate(rows[0]);
    }
  } finally {
    await connection.end();
  }
}

// Sync local inventory to QuickBooks
router.post("/sync-to-quickbooks", authMiddleware, async (req, res) => {
  try {
    const qbo = await getQuickBooksClient();
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Get all inventory items from local DB
    const [localItems] = await connection.execute("SELECT * FROM inventory");

    const results = {
      success: [],
      errors: [],
    };

    // Create/Update items in QuickBooks
    for (const item of localItems) {
      try {
        console.log("Processing item:", item.product_name);

        const itemData = {
          Name: item.product_name,
          Type: "Inventory",
          TrackQtyOnHand: true,
          QtyOnHand: item.inventory_size,
          InvStartDate: new Date().toISOString().split("T")[0],
          Description: item.description,
          PurchaseCost: parseFloat(item.cost),
          IncomeAccountRef: {
            value: "128",
            name: "Sales of Product Income",
          },
          AssetAccountRef: {
            value: "130",
            name: "Inventory Asset",
          },
          ExpenseAccountRef: {
            value: "129",
            name: "Cost of Goods Sold",
          },
        };

        if (item.quickbooks_item_id) {
          // Update existing item
          const result = await new Promise((resolve, reject) => {
            qbo.updateItem(
              { Id: item.quickbooks_item_id, ...itemData },
              (err, result) => {
                if (err) {
                  console.error("QuickBooks update error:", err);
                  reject(err);
                } else {
                  resolve(result);
                }
              }
            );
          });
          results.success.push({
            id: item.product_id,
            name: item.product_name,
            action: "updated",
            quickbooks_id: result.Id,
          });
        } else {
          // Create new item
          const result = await new Promise((resolve, reject) => {
            qbo.createItem(itemData, (err, result) => {
              if (err) {
                console.error("QuickBooks create error:", err);
                reject(err);
              } else {
                resolve(result);
              }
            });
          });

          // Store QuickBooks item ID
          await connection.execute(
            "UPDATE inventory SET quickbooks_item_id = ? WHERE product_id = ?",
            [result.Id, item.product_id]
          );

          results.success.push({
            id: item.product_id,
            name: item.product_name,
            action: "created",
            quickbooks_id: result.Id,
          });
        }
      } catch (error) {
        console.error("Error processing item:", error);
        results.errors.push({
          id: item.product_id,
          name: item.product_name,
          error: error.message || "Unknown error",
          details: error.fault || error,
        });
      }
    }

    await connection.end();

    res.json({
      message: "Sync completed",
      results,
      itemsProcessed: localItems.length,
    });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({
      error: "Failed to sync inventory",
      details: error.message,
      fault: error.fault || error,
    });
  }
});

// Get local inventory
router.get("/local-inventory", authMiddleware, async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [items] = await connection.execute("SELECT * FROM inventory");
    await connection.end();

    res.json({
      count: items.length,
      items: items,
    });
  } catch (error) {
    console.error("Error fetching local inventory:", error);
    res.status(500).json({
      error: "Failed to fetch local inventory",
      details: error.message,
    });
  }
});

// Get QuickBooks accounts
router.get("/quickbooks-accounts", authMiddleware, async (req, res) => {
  try {
    const qbo = await getQuickBooksClient();

    qbo.findAccounts(
      {
        AccountType: ["Income", "Cost of Goods Sold", "Other Current Asset"],
      },
      (err, accounts) => {
        if (err) {
          console.error("Error fetching accounts:", err);
          res.status(500).json({ error: "Failed to fetch accounts" });
        } else {
          res.json({
            income: accounts.QueryResponse.Account.filter(
              (a) => a.AccountType === "Income"
            ),
            cogs: accounts.QueryResponse.Account.filter(
              (a) => a.AccountType === "Cost of Goods Sold"
            ),
            asset: accounts.QueryResponse.Account.filter(
              (a) => a.AccountType === "Other Current Asset"
            ),
          });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to initialize QuickBooks client" });
  }
});

// Refresh QuickBooks token
router.post("/refresh-token", authMiddleware, async (req, res) => {
  try {
    const result = await refreshQuickBooksToken();
    res.json({
      message: "Token refreshed successfully",
      success: true,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      error: "Failed to refresh token",
      details: error.message,
    });
  }
});

// Update inventory quantity
router.put("/update-quantity", authMiddleware, async (req, res) => {
  try {
    const { product_id, new_quantity } = req.body;

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Update local inventory
    await connection.execute(
      "UPDATE inventory SET inventory_size = ? WHERE product_id = ?",
      [new_quantity, product_id]
    );

    // Get updated item details
    const [items] = await connection.execute(
      "SELECT * FROM inventory WHERE product_id = ?",
      [product_id]
    );

    await connection.end();

    if (items.length > 0) {
      // Trigger QuickBooks sync
      try {
        await syncItemToQuickBooks(items[0]);
        await updateSyncTimestamp(product_id);

        res.json({
          success: true,
          message: "Inventory updated and synced with QuickBooks",
          item: items[0],
        });
      } catch (syncError) {
        console.error("QuickBooks sync failed:", syncError);
        res.status(200).json({
          success: true,
          message: "Inventory updated but QuickBooks sync failed",
          syncError: syncError.message,
          item: items[0],
        });
      }
    } else {
      res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }
  } catch (error) {
    console.error("Error updating inventory:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update inventory",
      error: error.message,
    });
  }
});

// Get sync status dashboard
router.get("/sync-dashboard", authMiddleware, async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Get sync statistics
    const [items] = await connection.execute(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN quickbooks_item_id IS NOT NULL THEN 1 ELSE 0 END) as synced_items,
        MIN(last_sync) as oldest_sync,
        MAX(last_sync) as latest_sync
      FROM inventory
    `);

    // Get recently synced items
    const [recentSyncs] = await connection.execute(`
      SELECT product_name, inventory_size, last_sync
      FROM inventory
      WHERE last_sync IS NOT NULL
      ORDER BY last_sync DESC
      LIMIT 5
    `);

    await connection.end();

    res.json({
      stats: items[0],
      recent_syncs: recentSyncs,
    });
  } catch (error) {
    console.error("Error fetching sync dashboard:", error);
    res.status(500).json({
      error: "Failed to fetch sync dashboard",
      details: error.message,
    });
  }
});

// Manually trigger sync for specific items
router.post("/manual-sync", authMiddleware, async (req, res) => {
  try {
    const { product_ids } = req.body; // Array of product IDs to sync

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const results = {
      success: [],
      errors: [],
    };

    // Get items to sync
    const [items] = await connection.execute(
      "SELECT * FROM inventory WHERE product_id IN (?)",
      [product_ids]
    );

    // Sync each item
    for (const item of items) {
      try {
        await syncItemToQuickBooks(item);
        await updateSyncTimestamp(item.product_id);
        results.success.push({
          id: item.product_id,
          name: item.product_name,
        });
      } catch (error) {
        results.errors.push({
          id: item.product_id,
          name: item.product_name,
          error: error.message,
        });
      }
    }

    await connection.end();

    res.json({
      message: "Manual sync completed",
      results,
    });
  } catch (error) {
    console.error("Error in manual sync:", error);
    res.status(500).json({
      error: "Failed to perform manual sync",
      details: error.message,
    });
  }
});

// Batch update inventory quantities
router.post("/batch-update", authMiddleware, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: "Updates must be an array",
      });
    }

    const results = await batchUpdateInventory(updates);

    res.json({
      success: true,
      message: "Batch update completed",
      results,
    });
  } catch (error) {
    console.error("Error in batch update:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process batch update",
      error: error.message,
    });
  }
});

module.exports = router;
