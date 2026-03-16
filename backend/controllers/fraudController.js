const FraudReport = require('../models/FraudReport');
const Session = require('../models/Session');

// @desc    Create a new fraud report
// @route   POST /api/fraud
// @access  Private
const createFraudReport = async (req, res) => {
  const { sessionId, reason, screenshots } = req.body;

  try {
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is part of the session
    if (
      session.learner.toString() !== req.user._id.toString() &&
      session.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ message: 'User not authorized to report this session' });
    }

    const report = await FraudReport.create({
      session: sessionId,
      reporter: req.user._id,
      reason,
      screenshots,
    });

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all fraud reports (Admin feature simulation)
// @route   GET /api/fraud
// @access  Private
const getFraudReports = async (req, res) => {
  try {
    const reports = await FraudReport.find()
      .populate('reporter', 'name email')
      .populate('session')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createFraudReport,
  getFraudReports,
};
