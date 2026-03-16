const User = require('../models/User');

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

module.exports = {
  purchaseCredits,
  getCreditBalance
};
