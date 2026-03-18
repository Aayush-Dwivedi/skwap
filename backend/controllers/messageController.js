const Message = require('../models/Message');
const Session = require('../models/Session');
const Profile = require('../models/Profile');

const getMessages = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (
      session.learner.toString() !== req.user._id.toString() &&
      session.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const messages = await Message.find({ session: req.params.sessionId })
      .populate('sender', 'email')
      .sort({ createdAt: 1 });

    // Fetch profiles for all unique senders
    const senderIds = [...new Set(messages.map(m => m.sender._id))];
    const profiles = await Profile.find({ user: { $in: senderIds } });
    const profileMap = profiles.reduce((map, p) => {
      map[p.user.toString()] = { name: p.name, photoUrl: p.photoUrl };
      return map;
    }, {});

    // Attach profile info to message objects
    const messagesWithProfiles = messages.map(m => {
      const msgObj = m.toObject();
      if (msgObj.sender) {
        msgObj.sender = { ...msgObj.sender, ...profileMap[m.sender._id.toString()] };
      }
      return msgObj;
    });

    res.json(messagesWithProfiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  const { sessionId, text } = req.body;

  try {
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (
      session.learner.toString() !== req.user._id.toString() &&
      session.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const newMessage = new Message({
      session: sessionId,
      sender: req.user._id,
      text,
    });

    const savedMessage = await newMessage.save();
    
    // Populate sender email
    await savedMessage.populate('sender', 'email');
    
    // Fetch sender profile
    const profile = await Profile.findOne({ user: req.user._id });
    const msgObj = savedMessage.toObject();
    if (profile) {
      msgObj.sender = {
        ...msgObj.sender,
        name: profile.name,
        photoUrl: profile.photoUrl
      };
    }

    res.status(201).json(msgObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages,
  sendMessage,
};
