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
        content: `Welcome to Skill Trade! We've added 100 credits to your wallet to get you started.`,
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
        content: `Welcome to Skill Trade! We've added 100 credits to your wallet for joining with Google.`,
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

const crypto = require('crypto');
const nodemailer = require('nodemailer');

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // 1. Generate unique token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 2. Hash token and save to database with expiry (30 mins)
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;

    await user.save();

    // Support local testing, fallback to CLIENT_URL or referrer/origin
    const clientUrl = process.env.CLIENT_URL || req.headers.referer || req.headers.origin || 'http://localhost:5173';
    const cleanOrigin = clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl;
    const baseUrl = cleanOrigin.replace('/forgot-password', '');
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

    const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; background-color: #0b0709; color: #ffffff; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="display: inline-block; padding: 12px; background: rgba(224, 30, 90, 0.1); border-radius: 12px; margin-bottom: 10px;">
              <span style="font-size: 24px; font-weight: bold; color: #e01e5a; letter-spacing: 2px;">SKILL TRADE</span>
            </div>
            <h2 style="font-size: 20px; font-weight: 600; margin: 0; color: #ffffff;">Password Reset Request</h2>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #b3a7ad;">Hello,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #b3a7ad;">We received a request to reset the password for your Skill Trade account. If you did not make this request, you can safely ignore this email.</p>
          <p style="font-size: 14px; line-height: 1.6; color: #b3a7ad;">To choose a new password, click the button below within the next 30 minutes:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #e01e5a; color: #ffffff; padding: 12px 30px; border-radius: 10px; font-size: 14px; font-weight: bold; text-decoration: none; transition: background 0.3s; box-shadow: 0 4px 15px rgba(224, 30, 90, 0.4);">Reset Password</a>
          </div>
          <div style="background: rgba(224, 30, 90, 0.05); border-left: 3px solid #e01e5a; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
            <p style="font-size: 13px; margin: 0; color: #b3a7ad;">💡 <strong>Note:</strong> If you do not see this email in your inbox within a few minutes, please check your <strong>Spam</strong> or <strong>Junk</strong> folder and mark it as 'Not Spam' for future support notifications.</p>
          </div>
          <p style="font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 15px; margin-top: 25px;">
            If the button doesn't work, copy and paste this URL into your browser:<br/>
            <a href="${resetUrl}" style="color: #e01e5a; word-break: break-all; text-decoration: none;">${resetUrl}</a>
          </p>
        </div>
      `;

    // 3. Send email using the unified sendEmail utility (Resend -> SMTP fallback)
    const sendEmail = require('../utils/sendEmail');
    await sendEmail({
      to: user.email,
      subject: 'Skill Trade - Password Reset Request',
      html: emailHtml
    });

    res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    const apiErrorMsg = error.response?.data?.message || error.message || 'Could not send reset email. Please try again later.';
    res.status(error.response?.status || 500).json({ message: apiErrorMsg });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password) {
      return res.status(400).json({ message: 'Please provide a new password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // 1. Hash the incoming token to match what's in the database
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 2. Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    // 3. Set the new password (pre-save hook will automatically hash it)
    user.passwordHash = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Could not reset password. Please try again later.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateUserProfile,
  googleLogin,
  forgotPassword,
  resetPassword,
};
