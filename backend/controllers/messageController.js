const Message = require('../models/Message');
const Session = require('../models/Session');

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
      .populate('sender', 'name photoUrl')
      .sort({ createdAt: 1 });

    res.json(messages);
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

    await savedMessage.populate('sender', 'name photoUrl');

    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages,
  sendMessage,
};
