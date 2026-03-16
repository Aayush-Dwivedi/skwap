const express = require('express');
const router = express.Router();
const {
  createSessionRequest,
  getSessionRequests,
  updateRequestStatus,
} = require('../controllers/sessionRequestController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createSessionRequest).get(protect, getSessionRequests);
router.route('/:id/status').put(protect, updateRequestStatus);

module.exports = router;
