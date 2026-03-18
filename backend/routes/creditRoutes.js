const express = require('express');
const router = express.Router();
const { purchaseCredits, getCreditBalance, getTransactionHistory } = require('../controllers/creditController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/purchase', protect, purchaseCredits);
router.get('/balance', protect, getCreditBalance);
router.get('/history', protect, getTransactionHistory);

module.exports = router;
