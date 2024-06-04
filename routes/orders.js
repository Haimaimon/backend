const { Order } = require("../models/order");
const { Product } = require("../models/product");
const { auth, isUser, isAdmin } = require("../middleware/auth");
const moment = require("moment");
const router = require("express").Router();


// CREATE: Endpoint to create a new order. Requires authentication.
router.post("/", auth, async (req, res) => {
  const newOrder = new Order(req.body);

  try {
    const savedOrder = await newOrder.save();

    // Reduce stock quantity
    savedOrder.products.forEach(async (item) => {
      const product = await Product.findById(item.productId);
      product.quantity -= item.quantity;
      await product.save();
    });

    res.status(201).send(savedOrder);
  } catch (error) {
    res.status(500).send(error);
  }
});


// UPDATE: Endpoint to update an existing order. Requires admin privileges.
router.put("/:id", isAdmin, async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.status(200).send(updatedOrder);
  } catch (err) {
    res.status(500).send(err);
  }
});

// DELETE: Endpoint to delete an order. Requires admin privileges.
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).send("Order has been deleted...");
  } catch (err) {
    res.status(500).send(err);
  }
});

// GET USER ORDERS: Endpoint to retrieve a specific order by ID. Requires authentication.
router.get("/findOne/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (req.user._id != order.userId || !req.user.isAdmin)
      return res.status(403).send("Access denied. Not authorized");
    res.status(200).send(order);
  } catch (err) {
    res.status(500).send(err);
  }
});

// GET ALL ORDERS: Endpoint to retrieve all orders. Supports query for latest orders. Requires admin privileges.
router.get("/", isAdmin, async (req, res) => {
  const query = req.query.new;
  try {
    const orders = query
      ? await Order.find().sort({ _id: -1 }).limit(4)
      : await Order.find().sort({ _id: -1 });
    res.status(200).send(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

// GET MONTHLY INCOME: Endpoint to retrieve income statistics for the last month. Requires admin privileges.
router.get("/income/stats", isAdmin, async (req, res) => {
  const date = new Date();
  const lastMonth = new Date(date.setMonth(date.getMonth() - 1));
  const previousMonth = new Date(new Date().setMonth(lastMonth.getMonth() - 1));

  try {
    const income = await Order.aggregate([
      { $match: { createdAt: { $gte: previousMonth } } },
      {
        $project: {
          month: { $month: "$createdAt" },
          sales: "$amount",
        },
      },
      {
        $group: {
          _id: "$month",
          total: { $sum: "$sales" },
        },
      },
    ]);
    res.status(200).send(income);
  } catch (err) {
    res.status(500).send(err);
  }
});

// GET WEEKLY SALES: Endpoint to retrieve sales statistics for the last 7 days. Requires admin privileges.
router.get("/week-sales", isAdmin, async (req, res) => {
  const last7Days = moment()
    .day(moment().day() - 7)
    .format("YYYY-MM-DD HH:mm:ss");

  try {
    const income = await Order.aggregate([
      {
        $match: { createdAt: { $gte: new Date(last7Days) } },
      },
      {
        $project: {
          day: { $dayOfWeek: "$createdAt" },
          sales: "$total",
        },
      },
      {
        $group: {
          _id: "$day",
          total: { $sum: "$sales" },
        },
      },
    ]);
    res.status(200).send(income);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Get orders by user ID
router.get('/user/:userId', async (req, res) => {
  try {
      const orders = await Order.find({ userId: req.params.userId });
      res.status(200).json(orders);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});


module.exports = router;
