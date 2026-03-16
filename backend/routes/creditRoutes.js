const express = require('express');
const router = express.Router();
const { purchaseCredits, getCreditBalance } = require('../controllers/creditController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/purchase', protect, purchaseCredits);
router.get('/balance', protect, getCreditBalance);

module.exports = router;
