const express = require('express');
const router = express.Router();
const { getMessages, sendMessage } = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/:sessionId').get(protect, getMessages);
router.route('/').post(protect, sendMessage);

module.exports = router;
