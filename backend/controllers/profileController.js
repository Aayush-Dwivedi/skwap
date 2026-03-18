const Profile = require('../models/Profile');

const getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id }).populate(
      'user',
      ['email', 'credits']
    );

    if (!profile) {
      return res.status(404).json({ message: 'There is no profile for this user' });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const createOrUpdateProfile = async (req, res) => {
  const {
    photoUrl,
    name,
    currentSkills,
    skillsToLearn,
    linkedin,
    github,
    portfolio,
    twitter,
    themeBackground,
    isDynamicTheme,
    colorMode,
    showSocialLinks,
  } = req.body;

  const profileFields = {};
  profileFields.user = req.user._id;
  if (photoUrl) profileFields.photoUrl = photoUrl;
  if (name) profileFields.name = name;
  if (currentSkills) {
    profileFields.currentSkills = Array.isArray(currentSkills)
      ? currentSkills
      : currentSkills.split(',').map((skill) => skill.trim());
  }
  if (skillsToLearn) {
    profileFields.skillsToLearn = Array.isArray(skillsToLearn)
      ? skillsToLearn
      : skillsToLearn.split(',').map((skill) => skill.trim());
  }

  // Handle social links — only update if provided to avoid wiping existing ones
  const sl = req.body.socialLinks || {};
  const linked = linkedin || sl.linkedin;
  const git = github || sl.github;
  const port = portfolio || sl.portfolio;
  const twit = twitter || sl.twitter;

  if (linked || git || port || twit) {
    profileFields.socialLinks = {};
    if (linked) profileFields.socialLinks.linkedin = linked;
    if (git) profileFields.socialLinks.github = git;
    if (port) profileFields.socialLinks.portfolio = port;
    if (twit) profileFields.socialLinks.twitter = twit;
  }

  if (themeBackground) profileFields.themeBackground = themeBackground;
  if (isDynamicTheme !== undefined) profileFields.isDynamicTheme = isDynamicTheme;
  if (colorMode) profileFields.colorMode = colorMode;
  if (showSocialLinks !== undefined) profileFields.showSocialLinks = showSocialLinks;

  try {
    let profile = await Profile.findOne({ user: req.user._id });

    if (profile) {
      profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        { $set: profileFields },
        { new: true }
      );
      return res.json(profile);
    }

    profile = new Profile(profileFields);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const getProfileByUserId = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate('user', ['email', 'credits']);

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.status(500).send('Server Error');
  }
};

module.exports = { getMyProfile, createOrUpdateProfile, getProfileByUserId };
