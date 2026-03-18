const Notification = require('../models/Notification');
const Profile = require('../models/Profile');

/**
 * Creates a notification in the database and emits it via socket.io
 * @param {Object} io - Socket.io instance from req.io
 * @param {Object} data - Notification data
 * @param {string} data.user - Target user ID
 * @param {string} data.type - Notification type
 * @param {string} data.content - Notification text
 * @param {string} [data.relatedId] - Optional ID of related object (request, session, etc)
 */
const createAndEmitNotification = async (io, data) => {
  try {
    const notification = await Notification.create(data);
    
    if (io) {
      // Populate sender profile data for the socket emission
      let populatedNotif = notification.toObject();
      if (data.sender) {
        const senderProfile = await Profile.findOne({ user: data.sender });
        if (senderProfile) {
          populatedNotif.sender = {
            _id: data.sender,
            name: senderProfile.name,
            photoUrl: senderProfile.photoUrl
          };
        }
      }
      
      // Emit to the user's private room
      io.to(data.user.toString()).emit('notification received', populatedNotif);
      console.log(`Socket: Notification emitted to user ${data.user} with sender info`);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating/emitting notification:', error);
    throw error;
  }
};

module.exports = { createAndEmitNotification };
