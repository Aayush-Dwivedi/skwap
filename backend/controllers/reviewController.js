const Review = require('../models/Review');
const Session = require('../models/Session');
const Profile = require('../models/Profile');

// @desc    Create a review for a session
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  const { sessionId, rating, message } = req.body;

  try {
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Can only review completed sessions' });
    }

    // Check if user is part of the session
    const isLearner = session.learner.toString() === req.user._id.toString();
    const isTeacher = session.teacher.toString() === req.user._id.toString();

    if (!isLearner && !isTeacher) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Determine who is being reviewed
    const revieweeId = isLearner ? session.teacher : session.learner;

    // Check if review already exists
    const existingReview = await Review.findOne({
      session: sessionId,
      reviewer: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this session' });
    }

    const review = await Review.create({
      session: sessionId,
      reviewer: req.user._id,
      reviewee: revieweeId,
      rating,
      message,
    });

    // Update reviewee's profile rating (simplified average)
    const profile = await Profile.findOne({ user: revieweeId });
    if (profile) {
      const allReviews = await Review.find({ reviewee: revieweeId });
      const avgRating = allReviews.reduce((acc, item) => item.rating + acc, 0) / allReviews.length;
      profile.rating = avgRating.toFixed(1);
      await profile.save();
    }

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reviews for a user
// @route   GET /api/reviews/user/:userId
// @access  Public
const getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name photoUrl')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getUserReviews,
};
