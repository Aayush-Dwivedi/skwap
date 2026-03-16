const SessionRequest = require('../models/SessionRequest');
const Listing = require('../models/Listing');
const Profile = require('../models/Profile');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Session = require('../models/Session');

const createSessionRequest = async (req, res) => {
  const { listingId, durationHours, message } = req.body;

  try {
    const listing = await Listing.findById(listingId).populate('user', 'name');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const teacherId = listing.user._id ? listing.user._id.toString() : listing.user.toString();
    const learnerId = req.user._id.toString();

    if (teacherId === learnerId) {
      return res.status(400).json({ message: 'Cannot request your own listing' });
    }

    const learnerProfile = await Profile.findOne({ user: req.user._id });
    if (!learnerProfile) {
      return res.status(400).json({ message: 'Please complete your profile first before requesting a session.' });
    }

    let requestType = 'CREDITS';
    let requestCredits = 0;

    const matchedSkills = (learnerProfile.currentSkills || []).filter(skill => 
      listing.barterSkills && listing.barterSkills.some(bs => bs.toLowerCase() === skill.toLowerCase())
    );

    if (listing.method === 'BARTER') {
      requestType = 'BARTER';
      req.body.offeredSkill = matchedSkills.length > 0 ? matchedSkills[0] : (learnerProfile.currentSkills?.[0] || 'Skill Swap');
    } else if (listing.method === 'BOTH') {
      if (matchedSkills.length > 0) {
        requestType = 'BARTER';
        req.body.offeredSkill = matchedSkills[0];
      } else {
        requestType = 'CREDITS';
      }
    } else {
      requestType = 'CREDITS';
    }

    if (requestType === 'CREDITS') {
      requestCredits = (listing.creditsPerHour || 0) * (durationHours || 1);
      const learnerUser = await User.findById(req.user._id);

      if (learnerUser.credits < requestCredits) {
        return res.status(400).json({ 
          message: `Not enough credits. You have ${learnerUser.credits} but need ${requestCredits}. Add a skill to teach to earn more!` 
        });
      }
    }

    const newRequest = new SessionRequest({
      learner: learnerId,
      teacher: teacherId,
      listing: listing._id,
      type: requestType,
      requestedSkill: listing.skillName,
      durationHours,
      offeredSkill: requestType === 'BARTER' ? (req.body.offeredSkill) : undefined,
      credits: requestType === 'CREDITS' ? requestCredits : undefined,
      message,
    });

    const savedRequest = await newRequest.save();

    // Notify Teacher
    await Notification.create({
      user: teacherId,
      type: 'NEW_REQUEST',
      content: `${learnerProfile.name} requested to learn ${listing.skillName} from you.`,
      relatedId: savedRequest._id
    });

    res.status(201).json(savedRequest);
  } catch (error) {
    console.error('Session Request Error:', error);
    res.status(500).json({ message: 'Internal Server Error: ' + error.message });
  }
};

const getSessionRequests = async (req, res) => {
  try {
    const isTeacher = req.query.role === 'teacher';
    
    const query = isTeacher ? { teacher: req.user._id } : { learner: req.user._id };

    const requests = await SessionRequest.find(query)
      .populate('learner', 'name email')
      .populate('teacher', 'name email')
      .populate('listing', 'skillName type')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRequestStatus = async (req, res) => {
  const { status, message } = req.body;

  try {
    const request = await SessionRequest.findById(req.params.id)
      .populate('learner', 'name credits')
      .populate('teacher', 'name')
      .populate('listing', 'skillName');

    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.teacher._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    request.status = status;
    if (message) request.message = message;

    const updatedRequest = await request.save();

    // If Accepted, create a Session and handle credits if applicable
    if (status === 'ACCEPTED') {
      // 1. Create the session
      const newSession = await Session.create({
        request: request._id,
        learner: request.learner._id,
        teacher: request.teacher._id,
        status: 'PENDING_START'
      });

      // 2. If it was a credit booking, deduct credits from learner (ESCROW SIMULATION)
      // In a real app, you might hold them in escrow. Here we'll just deduct upon acceptance.
      if (request.type === 'CREDITS' && request.credits > 0) {
        const learner = await User.findById(request.learner._id);
        learner.credits -= request.credits;
        await learner.save();
      }

      // 3. Notify Learner (Link to SESSION for chat access)
      await Notification.create({
        user: request.learner._id,
        type: 'REQUEST_ACCEPTED',
        content: `Your request for ${request.requestedSkill} was accepted by ${request.teacher.name}!`,
        relatedId: newSession._id
      });
    } else if (status === 'DECLINED') {
      // Notify Learner of declination
      await Notification.create({
        user: request.learner._id,
        type: 'REQUEST_DECLINED',
        content: `Your request for ${request.requestedSkill} was declined by ${request.teacher.name}.`,
        relatedId: request._id
      });
    }

    res.json(updatedRequest);
  } catch (error) {
    console.error('Update Request Error:', error);
    res.status(500).json({ message: 'Internal Server Error: ' + error.message });
  }
};

module.exports = {
  createSessionRequest,
  getSessionRequests,
  updateRequestStatus,
};
