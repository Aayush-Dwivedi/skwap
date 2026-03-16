const express = require('express');
const router = express.Router();
const {
  createListing,
  getListings,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing,
} = require('../controllers/listingController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(getListings).post(protect, createListing);
router.route('/me').get(protect, getMyListings);
router
  .route('/:id')
  .get(getListingById)
  .put(protect, updateListing)
  .delete(protect, deleteListing);

module.exports = router;
