const mongoose = require('mongoose');

const listingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['TEACH', 'LEARN'],
      required: true,
    },
    skillName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      enum: ['BARTER', 'CREDITS', 'BOTH'],
      required: true,
    },
    barterSkills: [{ type: String }],
    creditsPerHour: { type: Number },
    portfolioLink: { type: String },
    availability: { type: String },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Listing', listingSchema);
