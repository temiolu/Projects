const express = require("express");
const app = express();
const axios = require("axios");
const session = require("express-session");
const methodOverride = require("method-override");
require('dotenv').config();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(methodOverride("_method"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // set to true in production with HTTPS
  })
);

// AUTH for protected routes
const auth = (req, res, next) => {
  if (req.session && req.session.token) {
    next();
  } else {
    res.redirect("/");
  }
};

// Session Variables
const setUserStatus = (req, res, next) => {
  res.locals.isLoggedIn = req.session.token ? true : false; // true if there's a token
  res.locals.userEmail = req.session.email;
  res.locals.role = req.session.role;
  res.locals.cartLength = req.session.cart;
  res.locals.currentRoute = req.path;
  next(); // Call the next middleware/route handler
};

app.use(setUserStatus);
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  next();
});

// Render registration page
app.get("/register", (req, res) => {
  res.render("pages/register.ejs", { errorMessage: null });
});

// Handle registration form submission
app.post("/register", async (req, res) => {
  const { email, password, username } = req.body;

  try {
    const response = await axios.post("http://localhost:3000/auth/register", {
      email,
      password,
      username,
    });

    if (response.data.success) {
      return res.redirect("/login");
    } else {
      return res.render("pages/register.ejs", { errorMessage: response.data.message });
    }
  } catch (error) {
    console.error("Registration error:", error);
    return res.render("pages/register.ejs", { errorMessage: "Registration failed. Please try again." });
  }
});

// Functions for Inventory and Invoice GET
const getInventory = async (token) => {
  try {
    const response = await axios.get(
      "http://127.0.0.1:3000/api/inventory/quickbooks-inventory",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory data:", error);
    throw new Error("Failed to fetch inventory data");
  }
};

const getInvoice = async (token) => {
  try {
    const response = await axios.get(
      "http://127.0.0.1:3000/api/invoices/",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching invoice data:", error);
    throw new Error("Failed to fetch invoice data");
  }
};
const getUsers = async (token) => {
  try {
    const response = await axios.get(
      "http://127.0.0.1:3000/api/users/",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw new Error("Failed to fetch user data");
  }
};


app.get("/home", auth, (req, res) => {
  const APIKEY = process.env.MAPKEY
  res.render("pages/home.ejs", {APIKEY});
});

app.get("/", (req, res) => {
  res.render("pages/welcome.ejs", {});
});

app.get("/login", function (req, res) {
  res.render("pages/login.ejs", {
    email: "",
    auth: false,
    errorMessage: null,
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.redirect("/home");
    }
    res.redirect("/login");
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const response = await axios.post("http://localhost:3000/auth/login", {
      email,
      password,
    });

    if (response.data.success) {
      req.session.token = response.data.token;
      req.session.email = response.data.user.email;
      req.session.role = response.data.user.role;
      return res.redirect("/home");
    } else {
      return res.render("pages/login.ejs", {
        email,
        auth: false,
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.render("pages/login.ejs", {
      email,
      auth: false,
      errorMessage: "Invalid Email or Password",
    });
  }
});

// INVENTORY CRUD
app.get("/product/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const token = req.session.token;
    const response = await axios.get(
      `http://127.0.0.1:3000/api/inventory/quickbooks-inventory/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const response2 = await axios.get(
      `http://127.0.0.1:3000/api/inventory/image/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    res.render("pages/productview.ejs", { productItem: response.data, image: response2.data });
  } catch (error) {
    console.error("Error in API request:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/auth/request-password-reset', (req, res) => {
  res.render('pages/request-password-reset.ejs', { message: null });
});


app.get('/auth/reset-password', (req, res) => {
  const token = req.query.token;
  if (!token) {
      return res.status(400).send('Token is required');
  }
  res.render('pages/reset-password.ejs', { token, message: null });
});

// Handle password reset form submission
app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
      const response = await axios.post('http://localhost:3000/auth/reset-password', {
          token,
          newPassword,
      });

      if (response.data.success) {
          return res.render('pages/login.ejs', {
              message: 'Password reset successful. Please login.',
              email: '',
              auth: false,
              errorMessage: null
          });
      } else {
          return res.render('pages/reset-password.ejs', {
              message: response.data.message || 'Password reset failed. Please try again.',
              token,
          });
      }
  } catch (error) {
      console.error('Password reset error:', error);
      return res.render('pages/reset-password.ejs', {
          message: 'An error occurred while resetting your password. Please try again.',
          token,
      });
  }
});

app.post('/auth/request-password-reset', async (req, res) => {
  const { email } = req.body;

  try {
    const response = await axios.post('http://localhost:3000/auth/request-password-reset', { email });

    if (response.data.success) {
      return res.render('pages/request-password-reset.ejs', {
        message: 'A password reset link has been sent to your email.',
      });
    } else {
      return res.render('pages/request-password-reset.ejs', {
        message: response.data.message || 'Failed to send reset link. Please try again.',
      });
    }
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return res.render('pages/request-password-reset.ejs', {
      message: 'An error occurred. Please try again later.',
    });
  }
});

// PRODUCT PAGES LIST
app.get("/charcoal", auth, async (req, res) => {
  try {
    const token = req.session.token;
    const allprod = await getInventory(token);
    const imageData = await axios.get(
      "http://127.0.0.1:3000/api/inventory/images",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.render("pages/charcoal.ejs", { allprod, images: imageData.data });
  } catch (error) {
    console.error("Error fetching products", error);
    res.status(500).send("Internal Server Error");

  }
});

app.get("/search", auth, async (req, res) => {
  try {
    const token = req.session.token;
    const allprod = await getInventory(token);
    const searchQuery = req.query.search;
    const imageData = await axios.get(
      "http://127.0.0.1:3000/api/inventory/images",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.render("pages/search.ejs", { allprod, images: imageData.data, searchQuery });
  } catch (error) {
    console.error("Error fetching products", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/products", auth, async (req, res) => {
  try {
    const token = req.session.token;
    const allprod = await getInventory(token);
    const imageData = await axios.get(
      "http://127.0.0.1:3000/api/inventory/images",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.render("pages/all.ejs", { allprod, images: imageData.data });
  } catch (error) {
    console.error("Error fetching products", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/accessories", auth, async (req, res) => {
  try {
    const token = req.session.token;
    const allprod = await getInventory(token);
    const imageData = await axios.get(
      "http://127.0.0.1:3000/api/inventory/images",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.render("pages/accessories.ejs", { allprod, images: imageData.data });
  } catch (error) {
    console.error("Error fetching products", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/hookahs", auth, async (req, res) => {
  try {
    const token = req.session.token;
    const allprod = await getInventory(token);
    const imageData = await axios.get(
      "http://127.0.0.1:3000/api/inventory/images",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.render("pages/hookah.ejs", { allprod, images: imageData.data });
  } catch (error) {
    console.error("Error fetching products", error);
    res.status(500).send("Internal Server Error");
  }
});

// CART OPERATIONS
app.get("/cart", auth, async (req, res) => {
  const token = req.session.token;
  const items = req.session.cart || [];
  const imageData = await axios.get(
    "http://127.0.0.1:3000/api/inventory/images",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  res.render("pages/cart.ejs", { items, images: imageData.data  });
});

app.post("/add-to-cart", auth, async (req, res) => {
  const { id, quantity, name, price } = req.body;
  console.log("Received id:", id, "quantity:", quantity, "name:", name, "price:", price);

  try {
    const token = req.session.token;
    const response = await axios.get(
      `http://127.0.0.1:3000/api/inventory/quickbooks-inventory/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      const product = response.data.item;
      const quantityParsed = parseInt(quantity, 10);

      const existingItemIndex = req.session.cart.findIndex((item) => item.id === id);
      if (existingItemIndex > -1) {
        req.session.cart[existingItemIndex].quantity += quantityParsed;
      } else {
        req.session.cart.push({
          id,
          name: product.name,
          price: product.unitPrice,
          quantity: quantityParsed,
        });
      }
      return res.redirect(`/product/${id}`);
    } else {
      return res.status(response.status).json({ message: "Failed to fetch product details" });
    }
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update item quantity in cart
app.put("/cart", auth, async (req, res) => {
  const { id, quantity } = req.body;

  try {
    const itemIndex = req.session.cart.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      return res.redirect("/cart");
    }
    req.session.cart[itemIndex].quantity = quantity;
    setTimeout(() => {
      res.redirect("/cart");
    }, 1000);
  } catch (error) {
    console.error("Error updating cart:", error.message);
    req.session.message = "Internal server error.";
    return res.redirect("/cart");
  }
});

// Place an order from the cart
app.post("/cart/order", auth, async (req, res) => {
  const { customer_name, customer_email, notes } = req.body;
  const items = JSON.parse(req.body.items);

  try {
    const token = req.session.token;
    const response = await axios.post(
      `http://127.0.0.1:3000/api/invoices/create`,
      {
        customer_name,
        customer_email,
        items,
        notes,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      req.session.cart = [];
      return res.render("pages/thanks.ejs", {
        message: `Order created successfully. Thank you for inquiring about our products! We will reach out via email to ${customer_email}`,
      });
    } else {
      return res.status(response.status).json({ message: "Failed to create order", error: response.data });
    }
  } catch (error) {
    console.error("Error creating order:", error.message);
    if (error.response) {
      return res.status(error.response.status).json({ message: "Error creating order", error: error.response.data });
    } else if (error.request) {
      return res.status(500).json({ message: "No response received from server" });
    } else {
      return res.status(500).json({ message: "Error", error: error.message });
    }
  }
});

// Delete item from cart
app.post("/cart", auth, async (req, res) => {
  const { id } = req.body;
  try {
    const itemIndex = req.session.cart.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      req.session.message = "Item not found in cart.";
      return res.redirect("/home");
    }
    req.session.cart.splice(itemIndex, 1);
    req.session.message = "Item removed successfully.";
    return res.redirect("/cart");
  } catch (error) {
    console.error("Error removing item from cart:", error.message);
    req.session.message = "Internal server error.";
    return res.redirect("/cart");
  }
});

// ADMIN PAGES
app.get("/admin/inventory", async (req, res) => {
  try {
    const token = req.session.token;
    const allprod = await getInventory(token);
    res.render("pages/inventory.ejs", { allprod });
  } catch (error) {
    res.status(500).send("User is not logged in");
  }
});

app.get("/admin/invoices", async (req, res) => {
  try {
    const token = req.session.token;
    const invoiceData = await getInvoice(token);
    res.render("pages/invoices.ejs", { invoiceData });
  } catch (error) {
    res.status(500).send("User is not logged in");
  }
});

app.get("/admin/invoices/manage/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const token = req.session.token;
    const response = await axios.get(
      `http://127.0.0.1:3000/api/invoices/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    res.render("pages/invoicemanage.ejs", { invoiceData: response.data });
    if (response.status === 200);
  } catch (error) {
    console.error("Error in API request:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.patch("/admin/invoices/manage/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const token = req.session.token;
    await axios.patch(
      `http://127.0.0.1:3000/api/invoices/${id}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setTimeout(() => res.redirect(`/admin/invoices/manage/${id}`), 1000);
  } catch (error) {
    console.error("Error updating invoice status:", error);
    res.status(500).send("Failed to update invoice status");
  }
});

app.get("/admin/users", async (req, res) => {
  try {
    const token = req.session.token;
    const userData = await getUsers(token);
    res.render("pages/users.ejs", { userData });
    console.log(userData)
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3001, () => {
  console.log("going to the moon on 3001.....");
});
