const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { createAndEmitNotification } = require('../utils/notificationHelper');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const purchaseCredits = async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid credit amount' });
  }

  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.credits += Number(amount);
    await user.save();

    // Create Transaction Record
    await Transaction.create({
      user: req.user._id,
      type: 'PURCHASE',
      amount: Number(amount),
      description: `Purchased ${amount} credits`
    });

    // 🔔 Notify User
    await createAndEmitNotification(req.io, {
      user: req.user._id,
      sender: req.user._id,
      type: 'WALLET_UPDATE',
      content: `Successfully added ${amount} credits to your wallet!`,
    });

    res.json({
      message: `Successfully added ${amount} credits`,
      credits: user.credits
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCreditBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ credits: user.credits });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return res.status(400).json({ message: 'Invalid credit amount' });
    }
    
    // 1 credit = 1.25 INR. Razorpay expects amount in paise (1 INR = 100 paise)
    // So, 1 credit = 125 paise
    // Receipt max length is 40 characters
    const shortUserId = req.user._id.toString().slice(-6);
    const options = {
      amount: amountNum * 125,
      currency: "INR",
      receipt: `rcpt_${shortUserId}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(500).json({ message: 'Failed to create Razorpay order' });
    }

    res.json(order);
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.credits += Number(amount);
      await user.save();

      await Transaction.create({
        user: req.user._id,
        type: 'PURCHASE',
        amount: Number(amount),
        description: `Purchased ${amount} credits via Razorpay`
      });

      await createAndEmitNotification(req.io, {
        user: req.user._id,
        sender: req.user._id,
        type: 'WALLET_UPDATE',
        content: `Successfully added ${amount} credits to your wallet!`,
      });

      res.json({ message: "Payment verified successfully", credits: user.credits });
    } else {
      res.status(400).json({ message: "Invalid payment signature" });
    }
  } catch (error) {
    console.error('Razorpay Verification Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  purchaseCredits,
  getCreditBalance,
  getTransactionHistory,
  createRazorpayOrder,
  verifyRazorpayPayment
};
