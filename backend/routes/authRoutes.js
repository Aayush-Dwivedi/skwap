const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateUserProfile,
  googleLogin,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateUserProfile);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
