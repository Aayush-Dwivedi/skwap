const mongoose = require('mongoose');

const sessionRequestSchema = mongoose.Schema(
  {
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
      default: 'PENDING',
    },
    type: {
      type: String,
      enum: ['BARTER', 'CREDITS'],
      required: true,
    },
    requestedSkill: {
      type: String,
      required: true,
    },
    durationHours: {
      type: Number,
      required: true,
      min: 1,
    },
    offeredSkill: { type: String }, // If BARTER
    credits: { type: Number }, // If CREDITS
    message: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SessionRequest', sessionRequestSchema);
