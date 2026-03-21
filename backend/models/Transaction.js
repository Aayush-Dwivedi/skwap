const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['PURCHASE', 'EARN', 'SPEND', 'REFUND'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    relatedSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SessionRequest',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);
