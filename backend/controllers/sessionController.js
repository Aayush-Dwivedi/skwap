const Session = require('../models/Session');
const SessionRequest = require('../models/SessionRequest');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Transaction = require('../models/Transaction');
const { createAndEmitNotification } = require('../utils/notificationHelper');
const nodemailer = require('nodemailer');

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

    const targetUserId = isLearner ? session.teacher : session.learner;
    const targetStarted = isLearner ? session.teacherStarted : session.learnerStarted;

    // 🔔 Smart Notification Logic
    if (!targetStarted) {
      // Notify the other party ONLY if they haven't started yet
      await createAndEmitNotification(req.io, {
        user: targetUserId,
        sender: req.user._id,
        type: 'SESSION_STARTED',
        content: `${userName} accepted to start the session. Now it's your turn!`,
        relatedId: session._id
      });
    } else {
      // Both have now started, notify both that it's active
      await createAndEmitNotification(req.io, {
        user: targetUserId,
        sender: req.user._id,
        type: 'SESSION_STARTED',
        content: `Session is now in progress! Good luck with your ${isLearner ? 'learning' : 'teaching'}.`,
        relatedId: session._id
      });
      
      await createAndEmitNotification(req.io, {
        user: req.user._id,
        sender: targetUserId,
        type: 'SESSION_STARTED',
        content: `Session is now in progress! Good luck with your ${isLearner ? 'teaching' : 'learning'}.`,
        relatedId: session._id
      });
    }

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
        const amount = session.finalCredits || session.request.credits || 0;
        const teacherUser = await User.findById(session.teacher);
        teacherUser.credits += amount;
        await teacherUser.save();

        // Log Transaction (Earn)
        await Transaction.create({
          user: session.teacher,
          type: 'EARN',
          amount: amount,
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
          content: `Part 1 complete! ${lProf?.name || 'Your partner'} will now teach ${session.request.offeredSkill} to you. Now it's your turn!`,
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
      const amount = session.finalCredits || session.request.credits || 0;
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

const cancelSession = async (req, res) => {
  const { reason } = req.body;

  try {
    const session = await Session.findById(req.params.id).populate('request');

    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isLearner = session.learner.toString() === req.user._id.toString();
    const isTeacher = session.teacher.toString() === req.user._id.toString();

    if (!isLearner && !isTeacher) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Cancellation is only allowed before the session actually begins (IN_PROGRESS)
    if (session.status !== 'PENDING_START') {
      return res.status(400).json({ message: 'Cannot cancel a session that has already started or completed' });
    }

    const cancelerProfile = await Profile.findOne({ user: req.user._id });
    const cancelerName = cancelerProfile?.name || 'User';

    // 1. Handle Refunds for Credit sessions
    if (session.request.type === 'CREDITS' && session.request.credits > 0) {
      const learner = await User.findById(session.learner);
      learner.credits += session.request.credits;
      await learner.save();

      // Log Transaction (Refund)
      await Transaction.create({
        user: session.learner,
        type: 'REFUND',
        amount: session.request.credits,
        description: `Refund for cancelled session: ${session.request.requestedSkill || 'Skill Swap'}`,
        relatedSession: session._id,
        relatedRequest: session.request._id
      });

      // 🔔 Notify Learner about refund
      await createAndEmitNotification(req.io, {
        user: session.learner,
        sender: req.user._id,
        type: 'WALLET_UPDATE',
        content: `${session.request.credits} credit${session.request.credits > 1 ? 's' : ''} refunded for cancelled session.`,
        relatedId: session._id
      });
    }

    // 2. Mark session as CANCELLED
    session.status = 'CANCELLED';
    await session.save();

    // 🔔 Notify the other party
    const targetUserId = isLearner ? session.teacher : session.learner;
    await createAndEmitNotification(req.io, {
      user: targetUserId,
      sender: req.user._id,
      type: 'SESSION_CANCELLED',
      content: `${cancelerName} cancelled the session. Reason: ${reason || 'No reason provided.'}`,
      relatedId: session._id
    });

    // 🔄 Sync session state across both clients
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
    console.error('Cancel Session Error:', error);
    res.status(500).json({ message: 'Internal Server Error: ' + error.message });
  }
};

const proposeCredits = async (req, res) => {
  const { credits } = req.body;
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isLearner = session.learner.toString() === req.user._id.toString();
    const isTeacher = session.teacher.toString() === req.user._id.toString();

    if (!isLearner && !isTeacher) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    if (session.status !== 'NEGOTIATING') {
      return res.status(400).json({ message: 'Session is not in negotiation' });
    }

    if (!credits || credits <= 0) {
      return res.status(400).json({ message: 'Credits must be a positive number' });
    }

    session.proposedCredits = credits;
    session.proposer = req.user._id;
    await session.save();

    // 🔔 Notify the other party
    const targetUserId = isLearner ? session.teacher : session.learner;
    const proposerProfile = await Profile.findOne({ user: req.user._id });
    
    await createAndEmitNotification(req.io, {
      user: targetUserId,
      sender: req.user._id,
      type: 'WALLET_UPDATE',
      content: `${proposerProfile?.name || 'Your partner'} proposed ${credits} credits for the session.`,
      relatedId: session._id
    });

    // 🔄 Sync
    const updatedSession = await Session.findById(session._id)
      .populate('learner', 'email')
      .populate('teacher', 'email')
      .populate('request');

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

const acceptCredits = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('request');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.status !== 'NEGOTIATING') {
      return res.status(400).json({ message: 'No credits to accept' });
    }

    if (!session.proposedCredits || !session.proposer) {
      return res.status(400).json({ message: 'No credits have been proposed yet' });
    }

    if (session.proposer.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot accept your own proposal' });
    }

    const learner = await User.findById(session.learner);
    if (learner.credits < session.proposedCredits) {
      return res.status(400).json({ message: 'Learner does not have enough credits' });
    }

    // 1. Finalize Credits
    session.finalCredits = session.proposedCredits;
    session.status = 'PENDING_START';
    
    // 2. Deduct credits from learner
    learner.credits -= session.finalCredits;
    await learner.save();

    // 3. Log Transaction
    await Transaction.create({
      user: session.learner,
      type: 'SPEND',
      amount: session.finalCredits,
      description: `Booked session for ${session.request.requestedSkill}`,
      relatedSession: session._id,
      relatedRequest: session.request._id
    });

    await session.save();

    // 🔔 Notifications
    const accepterProfile = await Profile.findOne({ user: req.user._id });
    await createAndEmitNotification(req.io, {
      user: session.proposer,
      sender: req.user._id,
      type: 'WALLET_UPDATE',
      content: `${accepterProfile?.name || 'Your partner'} accepted the credit proposal. Session is ready!`,
      relatedId: session._id
    });

    // 🔄 Sync
    const updatedSession = await Session.findById(session._id)
      .populate('learner', 'email')
      .populate('teacher', 'email')
      .populate('request');

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

const scheduleSession = async (req, res) => {
  const { scheduledAt } = req.body;
  try {
    const session = await Session.findById(req.params.id).populate('request');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isLearner = session.learner.toString() === req.user._id.toString();
    const isTeacher = session.teacher.toString() === req.user._id.toString();

    if (!isLearner && !isTeacher) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    if (session.status !== 'PENDING_START') {
      return res.status(400).json({ message: 'Can only schedule sessions that are pending start' });
    }

    if (!scheduledAt) {
      return res.status(400).json({ message: 'Scheduled time is required' });
    }

    session.scheduledAt = new Date(scheduledAt);
    await session.save();

    // Notify the other party
    const targetUserId = isLearner ? session.teacher : session.learner;
    const Profile = require('../models/Profile');
    const schedulerProfile = await Profile.findOne({ user: req.user._id });

    await createAndEmitNotification(req.io, {
      user: targetUserId,
      sender: req.user._id,
      type: 'SESSION_SCHEDULED',
      content: `${schedulerProfile?.name || 'Your partner'} scheduled the session for ${new Date(scheduledAt).toLocaleString()}.`,
      relatedId: session._id
    });

    // Sync
    const updatedSession = await Session.findById(session._id)
      .populate('learner', 'email')
      .populate('teacher', 'email')
      .populate('request');

    const [lProf, tProf] = await Promise.all([
      Profile.findOne({ user: updatedSession.learner._id }),
      Profile.findOne({ user: updatedSession.teacher._id })
    ]);

    const sessionPayload = {
      ...updatedSession.toObject(),
      learner: { ...updatedSession.learner.toObject(), name: lProf?.name, photoUrl: lProf?.photoUrl },
      teacher: { ...updatedSession.teacher.toObject(), name: tProf?.name, photoUrl: tProf?.photoUrl }
    };

    req.io.to(session.learner._id.toString()).emit('session updated', sessionPayload);
    req.io.to(session.teacher._id.toString()).emit('session updated', sessionPayload);

    // Send Email to Both Users
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const formattedDate = new Date(scheduledAt).toLocaleString();
        
        const mailOptionsLearner = {
          from: `"Skill Trade Support" <${process.env.EMAIL_USER}>`,
          to: updatedSession.learner.email,
          subject: 'Your Skill Trade Meeting is Scheduled!',
          text: `Hi ${lProf?.name || 'User'},\n\nYour session with ${tProf?.name || 'your partner'} for "${updatedSession.request.requestedSkill || 'Skill Trade'}" has been scheduled for ${formattedDate}.\n\nPlease ensure you log in on time to join the meeting.\n\nBest,\nThe Skill Trade Team`,
        };

        const mailOptionsTeacher = {
          from: `"Skill Trade Support" <${process.env.EMAIL_USER}>`,
          to: updatedSession.teacher.email,
          subject: 'Your Skill Trade Meeting is Scheduled!',
          text: `Hi ${tProf?.name || 'User'},\n\nYou have successfully scheduled your session with ${lProf?.name || 'your partner'} for "${updatedSession.request.requestedSkill || 'Skill Trade'}" at ${formattedDate}.\n\nPlease ensure you log in on time to join the meeting.\n\nBest,\nThe Skill Trade Team`,
        };

        await Promise.all([
          transporter.sendMail(mailOptionsLearner),
          transporter.sendMail(mailOptionsTeacher)
        ]);
        console.log('Scheduling emails sent successfully');
      } catch (emailErr) {
        console.error('Failed to send scheduling emails:', emailErr);
        // We do not block the response if emails fail
      }
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
  cancelSession,
  proposeCredits,
  acceptCredits,
  scheduleSession
};
