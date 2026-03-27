const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  markSessionNotificationsAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(protect, getNotifications);
router.route('/readall').put(protect, markAllAsRead);
router.route('/session/:sessionId/read').put(protect, markSessionNotificationsAsRead);
router.route('/:id/read').put(protect, markAsRead);

module.exports = router;
