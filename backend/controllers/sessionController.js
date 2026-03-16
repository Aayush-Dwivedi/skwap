const Session = require('../models/Session');
const SessionRequest = require('../models/SessionRequest');
const User = require('../models/User');

const createSession = async (req, res) => {
  const { requestId } = req.body;

  try {
    const request = await SessionRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.teacher.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Only teacher can unlock session' });
    }

    const existingSession = await Session.findOne({ request: requestId });
    if (existingSession) {
      return res.status(400).json({ message: 'Session already exists for this request' });
    }

    request.status = 'ACCEPTED';
    await request.save();

    if (request.type === 'CREDITS') {
      const learner = await User.findById(request.learner);
      if (learner.credits < request.credits) {
        return res.status(400).json({ message: 'Learner no longer has enough credits' });
      }
      learner.credits -= request.credits;
      await learner.save();
    }

    const session = new Session({
      request: requestId,
      learner: request.learner,
      teacher: request.teacher,
      status: 'PENDING_START',
    });

    const savedSession = await session.save();

    // 🔔 Emit a real-time notification to the learner
    if (req.io) {
      req.io.to(request.learner.toString()).emit('notification', {
        message: `Your session request has been accepted! Chat is now unlocked.`,
        sessionId: savedSession._id,
      });
    }

    res.status(201).json(savedSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      $or: [{ learner: req.user._id }, { teacher: req.user._id }],
    })
      .populate('learner', 'name email photoUrl')
      .populate('teacher', 'name email photoUrl')
      .populate('request')
      .sort({ updatedAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const beginSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (
      session.learner.toString() !== req.user._id.toString() &&
      session.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    if (session.status !== 'PENDING_START') {
      return res.status(400).json({ message: 'Session already started or completed' });
    }

    session.startTime = Date.now();
    session.status = 'IN_PROGRESS';
    await session.save();

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const completeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('request');

    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isLearner = session.learner.toString() === req.user._id.toString();
    const isTeacher = session.teacher.toString() === req.user._id.toString();

    if (!isLearner && !isTeacher) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Session is not in progress' });
    }

    if (isLearner) session.learnerCompleted = true;
    if (isTeacher) session.teacherCompleted = true;

    if (session.learnerCompleted && session.teacherCompleted) {
      session.status = 'COMPLETED';

      if (session.request.type === 'CREDITS') {
        const teacherUser = await User.findById(session.teacher);
        teacherUser.credits += session.request.credits;
        await teacherUser.save();
      }
    }

    await session.save();

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSession,
  getMySessions,
  beginSession,
  completeSession,
};
