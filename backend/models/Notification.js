const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['NEW_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_DECLINED', 'SESSION_STARTED', 'SESSION_COMPLETED', 'NEW_MESSAGE', 'CREDITS_RECEIVED', 'WALLET_UPDATE', 'SESSION_CANCELLED', 'SESSION_SCHEDULED'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId, // Could be SessionRequest, Session, Message, etc.
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
