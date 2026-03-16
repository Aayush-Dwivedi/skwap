const express = require('express');
const router = express.Router();
const { createFraudReport, getFraudReports } = require('../controllers/fraudController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
  .post(protect, createFraudReport)
  .get(protect, getFraudReports);

module.exports = router;
