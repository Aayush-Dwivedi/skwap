const express = require('express');
const router = express.Router();
const {
  createSession,
  getMySessions,
  beginSession,
  completeSession,
  cancelSession,
  proposeCredits,
  acceptCredits,
  scheduleSession
} = require('../controllers/sessionController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createSession).get(protect, getMySessions);
router.route('/:id/begin').put(protect, beginSession);
router.route('/:id/schedule').put(protect, scheduleSession);
router.route('/:id/complete').put(protect, completeSession);
router.route('/:id/cancel').put(protect, cancelSession);
router.route('/:id/propose-credits').put(protect, proposeCredits);
router.route('/:id/accept-credits').put(protect, acceptCredits);

module.exports = router;
