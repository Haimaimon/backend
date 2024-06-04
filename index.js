const express = require("express")
const cors = require("cors")
//const products = require("./products")
const mongoose = require("mongoose");
const app = express();
const register = require("./routes/register");
const login = require("./routes/login");
const productsRoute = require("./routes/products");
const users = require("./routes/users");
const stripe = require("./routes/stripe");
const orders = require("./routes/orders");
const notifications = require("./routes/notifications");
const stockRouter = require("./routes/stockRouter");

require("dotenv").config();

app.use(express.json());
app.use(cors());

app.use("/api/register",register);
app.use("/api/login",login);
app.use("/api/products",productsRoute);
app.use("/api/users", users);
app.use("/api/stripe", stripe);
app.use("/api/orders",orders);
app.use("/api/notifications", notifications);
app.use("/api",stockRouter);

app.get("/", (req, res) => {
    res.send("Welcome to our online shop API...")
});

//app.get("/products", (req, res) => {
   // res.send(products);
//});

const port = process.env.PORT || 5000
const uri = process.env.DB_URI
app.listen(port ,console.log(`Server running on port ${port}`));

mongoose.connect(uri)
.then(() => console.log("MongoDb connection successful..."))
.catch((err) => console.log("MongoDb connection failed", err.message));