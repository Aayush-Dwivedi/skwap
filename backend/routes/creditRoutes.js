const express = require('express');
const router = express.Router();
const { purchaseCredits, getCreditBalance, getTransactionHistory, createRazorpayOrder, verifyRazorpayPayment, testRazorpay } = require('../controllers/creditController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/purchase', protect, purchaseCredits); // Keeping legacy just in case
router.get('/balance', protect, getCreditBalance);
router.get('/history', protect, getTransactionHistory);

// Razorpay Routes
router.get('/test-orders', testRazorpay);
router.post('/create-razorpay-order', protect, createRazorpayOrder);
router.post('/verify-razorpay-payment', protect, verifyRazorpayPayment);

module.exports = router;
