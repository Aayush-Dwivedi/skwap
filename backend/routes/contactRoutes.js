const express = require('express');
const router = express.Router();
const { submitContactForm } = require('../controllers/contactController');
const { protect } = require('../middlewares/authMiddleware'); // Optional, to require login

router.post('/', protect, submitContactForm);

module.exports = router;
