const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { createAndEmitNotification } = require('../utils/notificationHelper');

const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      email,
      passwordHash: password,
    });

    if (user) {
      // Log Transaction (Initial Bonus)
      const Transaction = require('../models/Transaction');
      await Transaction.create({
        user: user._id,
        type: 'PURCHASE', // Or 'EARN'? PURCHASE feels like a deposit
        amount: 100,
        description: 'Welcome Bonus'
      });

      // 🔔 Notify User about Welcome Bonus
      await createAndEmitNotification(req.io, {
        user: user._id,
        sender: user._id,
        type: 'CREDITS_RECEIVED',
        content: `Welcome to Skwap! We've added 100 credits to your wallet to get you started.`,
      });
      res.status(201).json({
        _id: user._id,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        email: user.email,
        credits: user.credits,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');

    if (user) {
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.passwordHash = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        email: updatedUser.email,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  try {
    const { tokenId } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, sub: googleId, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if they don't exist
      user = await User.create({
        email,
        googleId,
        // photoUrl could be handled here too if we want to sync with Google profile
      });

      // Welcome Bonus
      const Transaction = require('../models/Transaction');
      await Transaction.create({
        user: user._id,
        type: 'PURCHASE',
        amount: 100,
        description: 'Welcome Bonus (Google Sign-in)'
      });

      await createAndEmitNotification(req.io, {
        user: user._id,
        sender: user._id,
        type: 'WALLET_UPDATE',
        content: `Welcome to Skwap! We've added 100 credits to your wallet for joining with Google.`,
      });
    } else {
      // If user exists but doesn't have googleId, link it
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    }

    res.json({
      _id: user._id,
      email: user.email,
      token: generateToken(user._id),
      isNew: !user.createdAt || (new Date() - new Date(user.createdAt) < 5000), // Helper for frontend redirection
    });
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateUserProfile,
  googleLogin,
};
