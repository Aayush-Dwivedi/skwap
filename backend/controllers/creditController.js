const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { createAndEmitNotification } = require('../utils/notificationHelper');

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

module.exports = {
  purchaseCredits,
  getCreditBalance,
  getTransactionHistory
};
