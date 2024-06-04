const { Notification } = require("../models/notification");
const { auth, isUser, isAdmin } = require("../middleware/auth");
const router = require("express").Router();

// Route to handle creating a new notification
router.post("/", async (req, res) => {
    try {
        const { productId, userId } = req.body;

        // Create and save the new notification
        const notification = new Notification({
            productId,
            userId
        });
        await notification.save();

        res.status(201).send(notification);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).send(error);
    }
});

// Route to mark notifications as seen for a given product
router.patch("/updateQuantity", async (req, res) => {
    try {
        const { productId } = req.body;

        // Mark notifications for the product as seen
        const updatedNotifications = await Notification.updateMany(
            { productId, seen: false },
            { seen: true }
        );

        res.status(200).send(updatedNotifications);
    } catch (error) {
        console.error('Error updating notifications:', error);
        res.status(500).send(error);
    }
});

router.get("/", auth,async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id });
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// In your notifications.js route file
router.delete('/:id', auth, async (req, res) => {
    try {
      const notification = await Notification.findByIdAndDelete(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting notification', error });
    }
  });
  


module.exports = router;