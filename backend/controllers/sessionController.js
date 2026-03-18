const Session = require('../models/Session');
const SessionRequest = require('../models/SessionRequest');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Transaction = require('../models/Transaction');
const { createAndEmitNotification } = require('../utils/notificationHelper');

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

      // Log Transaction (Spend)
      await Transaction.create({
        user: request.learner,
        type: 'SPEND',
        amount: request.credits,
        description: `Booked session for ${request.skillName || 'Skill Swap'}`,
        relatedRequest: request._id
      });
    }

    const session = new Session({
      request: requestId,
      learner: request.learner,
      teacher: request.teacher,
      status: 'PENDING_START',
    });

    const savedSession = await session.save();

    // 🔔 Emit a real-time notification to the learner
    await createAndEmitNotification(req.io, {
      user: request.learner,
      sender: req.user._id,
      type: 'REQUEST_ACCEPTED',
      content: `Your session request has been accepted! Chat is now unlocked.`,
      relatedId: savedSession._id
    });

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
      .populate('learner', 'email')
      .populate('teacher', 'email')
      .populate('request')
      .sort({ updatedAt: -1 });

    // Fetch profiles for all unique learners and teachers
    const userIds = [...new Set(sessions.flatMap(s => [s.learner._id, s.teacher._id]))];
    const profiles = await Profile.find({ user: { $in: userIds } });
    const profileMap = profiles.reduce((map, p) => {
      map[p.user.toString()] = { name: p.name, photoUrl: p.photoUrl };
      return map;
    }, {});

    // Attach profile info to session objects
    const sessionsWithProfiles = sessions.map(s => {
      const sessionObj = s.toObject();
      if (sessionObj.learner) {
        sessionObj.learner = { ...sessionObj.learner, ...profileMap[s.learner._id.toString()] };
      }
      if (sessionObj.teacher) {
        sessionObj.teacher = { ...sessionObj.teacher, ...profileMap[s.teacher._id.toString()] };
      }
      return sessionObj;
    });

    res.json(sessionsWithProfiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const beginSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isLearner = session.learner.toString() === req.user._id.toString();
    const isTeacher = session.teacher.toString() === req.user._id.toString();

    if (!isLearner && !isTeacher) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    if (session.status !== 'PENDING_START') {
      return res.status(400).json({ message: 'Session already started or completed' });
    }

    const Profile = require('../models/Profile');
    const userProfile = await Profile.findOne({ user: req.user._id });
    const userName = userProfile?.name || 'User';

    if (isLearner) session.learnerStarted = true;
    if (isTeacher) session.teacherStarted = true;

    // Notify the other party
    const targetUserId = isLearner ? session.teacher : session.learner;
    await createAndEmitNotification(req.io, {
      user: targetUserId,
      sender: req.user._id,
      type: 'SESSION_STARTED',
      content: `${userName} accepted to start the session. Now it's your turn!`,
      relatedId: session._id
    });

    if (session.learnerStarted && session.teacherStarted) {
      session.startTime = Date.now();
      session.status = 'IN_PROGRESS';
    }

    await session.save();

    // 🔄 Sync session state across both clients (Populate first!)
    const updatedSession = await Session.findById(session._id)
      .populate('learner', 'email')
      .populate('teacher', 'email')
      .populate('request');

    // Fetch profiles for names
    const [lProf, tProf] = await Promise.all([
      Profile.findOne({ user: updatedSession.learner._id }),
      Profile.findOne({ user: updatedSession.teacher._id })
    ]);

    const sessionPayload = {
      ...updatedSession.toObject(),
      learner: { ...updatedSession.learner.toObject(), name: lProf?.name, photoUrl: lProf?.photoUrl },
      teacher: { ...updatedSession.teacher.toObject(), name: tProf?.name, photoUrl: tProf?.photoUrl }
    };

    req.io.to(session.learner.toString()).emit('session updated', sessionPayload);
    req.io.to(session.teacher.toString()).emit('session updated', sessionPayload);

    res.json(updatedSession);
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

        // Log Transaction (Earn)
        await Transaction.create({
          user: session.teacher,
          type: 'EARN',
          amount: session.request.credits,
          description: `Earned from teaching ${session.request.requestedSkill || 'Skill Swap'}`,
          relatedSession: session._id,
          relatedRequest: session.request._id
        });
      } else if (session.request.type === 'BARTER' && !session.isReverse) {
        // 🔄 AUTO-BARTER SWAP: Create the reciprocal session
        const reverseSession = new Session({
          request: session.request._id,
          learner: session.teacher, // Original teacher becomes learner
          teacher: session.learner, // Original learner becomes teacher
          status: 'PENDING_START',
          isReverse: true,
          originalSession: session._id
        });
        await reverseSession.save();

        // 🔔 Notify both about the second half of the swap
        const lProf = await Profile.findOne({ user: session.learner });
        const tProf = await Profile.findOne({ user: session.teacher });

        await createAndEmitNotification(req.io, {
          user: session.learner,
          sender: session.teacher,
          type: 'SESSION_STARTED',
          content: `Part 1 complete! Now it's your turn to teach ${session.request.offeredSkill} to ${tProf?.name || 'your partner'}.`,
          relatedId: reverseSession._id
        });

        await createAndEmitNotification(req.io, {
          user: session.teacher,
          sender: session.learner,
          type: 'SESSION_STARTED',
          content: `Part 1 complete! ${lProf?.name || 'Your partner'} will now teach ${session.request.offeredSkill} to you.`,
          relatedId: reverseSession._id
        });

        // Emit new session to both via socket
        const populatedReverse = await Session.findById(reverseSession._id)
          .populate('learner', 'email')
          .populate('teacher', 'email')
          .populate('request');

        const reversePayload = {
          ...populatedReverse.toObject(),
          learner: { ...populatedReverse.learner.toObject(), name: tProf?.name, photoUrl: tProf?.photoUrl },
          teacher: { ...populatedReverse.teacher.toObject(), name: lProf?.name, photoUrl: lProf?.photoUrl }
        };

        req.io.to(session.learner.toString()).emit('session created', reversePayload);
        req.io.to(session.teacher.toString()).emit('session created', reversePayload);
      }
    }

    await session.save();

    // 🔄 Sync session state across both clients (Populate first!)
    const updatedSession = await Session.findById(session._id)
      .populate('learner', 'email')
      .populate('teacher', 'email')
      .populate('request');

    // Fetch profiles for names
    const [lProf, tProf] = await Promise.all([
      Profile.findOne({ user: updatedSession.learner._id }),
      Profile.findOne({ user: updatedSession.teacher._id })
    ]);

    const sessionPayload = {
      ...updatedSession.toObject(),
      learner: { ...updatedSession.learner.toObject(), name: lProf?.name, photoUrl: lProf?.photoUrl },
      teacher: { ...updatedSession.teacher.toObject(), name: tProf?.name, photoUrl: tProf?.photoUrl }
    };

    req.io.to(session.learner.toString()).emit('session updated', sessionPayload);
    req.io.to(session.teacher.toString()).emit('session updated', sessionPayload);

    // 🔔 Credit Notifications
    if (session.status === 'COMPLETED' && session.request.type === 'CREDITS') {
      const amount = session.request.credits;
      // Notify Learner
      await createAndEmitNotification(req.io, {
        user: session.learner,
        sender: session.teacher,
        type: 'WALLET_UPDATE',
        content: `${amount} credit${amount > 1 ? 's' : ''} deducted for completing session: ${session.request.requestedSkill}`,
        relatedId: session._id
      });
      // Notify Teacher
      await createAndEmitNotification(req.io, {
        user: session.teacher,
        sender: session.learner,
        type: 'WALLET_UPDATE',
        content: `You earned ${amount} credit${amount > 1 ? 's' : ''} from teaching ${session.request.requestedSkill}!`,
        relatedId: session._id
      });
    }

    res.json(updatedSession);
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
