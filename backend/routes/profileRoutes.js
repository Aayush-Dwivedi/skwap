const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  createOrUpdateProfile,
  getProfileByUserId,
} = require('../controllers/profileController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/me', protect, getMyProfile);
router.post('/', protect, createOrUpdateProfile);
router.get('/user/:user_id', getProfileByUserId);

module.exports = router;
