const express = require('express');
const router = express.Router();
const {
  createSession,
  getMySessions,
  beginSession,
  completeSession,
} = require('../controllers/sessionController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createSession).get(protect, getMySessions);
router.route('/:id/begin').put(protect, beginSession);
router.route('/:id/complete').put(protect, completeSession);

module.exports = router;
