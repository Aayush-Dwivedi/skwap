const mongoose = require('mongoose');

const sessionSchema = mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SessionRequest',
      required: true,
    },
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
    status: {
      type: String,
      enum: ['NEGOTIATING', 'PENDING_START', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED'],
      default: 'PENDING_START',
    },
    scheduledAt: { type: Date },
    meetingStatus: {
      type: String,
      enum: ['WAITING', 'ACTIVE', 'ENDED'],
      default: 'WAITING',
    },
    proposedCredits: { type: Number },
    proposer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalCredits: { type: Number },
    startTime: { type: Date },
    learnerStarted: {
      type: Boolean,
      default: false,
    },
    teacherStarted: {
      type: Boolean,
      default: false,
    },
    learnerCompleted: {
      type: Boolean,
      default: false,
    },
    teacherCompleted: {
      type: Boolean,
      default: false,
    },
    learnerReviewed: {
      type: Boolean,
      default: false,
    },
    teacherReviewed: {
      type: Boolean,
      default: false,
    },
    isReverse: {
      type: Boolean,
      default: false,
    },
    originalSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Session', sessionSchema);
