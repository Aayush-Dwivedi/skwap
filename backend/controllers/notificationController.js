const Notification = require('../models/Notification');
const Profile = require('../models/Profile');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('sender', 'email')
      .sort({ createdAt: -1 });

    // Fetch profiles for all unique senders
    const senderIds = [...new Set(notifications.filter(n => n.sender).map(n => n.sender._id))];
    const profiles = await Profile.find({ user: { $in: senderIds } });
    const profileMap = profiles.reduce((map, p) => {
      map[p.user.toString()] = { name: p.name, photoUrl: p.photoUrl };
      return map;
    }, {});

    // Attach profile info to notification objects
    const notificationsWithProfiles = notifications.map(n => {
      const notifObj = n.toObject();
      if (notifObj.sender) {
        notifObj.sender = { ...notifObj.sender, ...profileMap[n.sender._id.toString()] };
      }
      return notifObj;
    });

    res.json(notificationsWithProfiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    notification.read = true;
    const updatedNotification = await notification.save();

    res.json(updatedNotification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
