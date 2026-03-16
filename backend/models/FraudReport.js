const mongoose = require('mongoose');

const fraudReportSchema = mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    screenshots: [{ type: String }],
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'],
      default: 'OPEN',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FraudReport', fraudReportSchema);
