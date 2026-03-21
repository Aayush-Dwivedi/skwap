const Listing = require('../models/Listing');

const createListing = async (req, res) => {
  const {
    type,
    skillName,
    description,
    method,
    barterSkills,
    creditsPerHour,
    portfolioLink,
    availability,
  } = req.body;

  try {
    let finalCredits = creditsPerHour;
    if (method === 'CREDITS' || method === 'BOTH') {
      finalCredits = 1;
    }

    const listing = new Listing({
      user: req.user._id,
      type,
      skillName,
      description,
      method,
      barterSkills,
      creditsPerHour: finalCredits,
      portfolioLink,
      availability,
    });

    const createdListing = await listing.save();
    res.status(201).json(createdListing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getListings = async (req, res) => {
  try {
    const query = { active: true };
    if (req.query.type) {
      query.type = req.query.type;
    }

    const listings = await Listing.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Filter out orphaned listings (where user no longer exists)
    const validListings = listings.filter(l => l.user);

    // Fetch profiles for all uploader IDs to get names and photos
    const userIds = validListings.map(l => l.user._id);
    const Profile = require('../models/Profile');
    const profiles = await Profile.find({ user: { $in: userIds } });

    // Map profiles for quick lookup
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.user.toString()] = {
        name: p.name,
        photoUrl: p.photoUrl,
        currentSkills: p.currentSkills,
        skillsToLearn: p.skillsToLearn,
        rating: p.rating,
        numReviews: p.numReviews,
        socialLinks: p.socialLinks,
        showSocialLinks: p.showSocialLinks,
      };
    });

    // Merge profile data into listings
    const formattedListings = validListings.map(l => {
      const listingObj = l.toObject();
      const upProfile = profileMap[l.user._id.toString()] || { name: 'User', photoUrl: '' };
      return {
        ...listingObj,
        uploader: upProfile
      };
    });

    res.json(formattedListings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    const Profile = require('../models/Profile');
    const profile = await Profile.findOne({ user: req.user._id });
    
    const formattedListings = listings.map(l => ({
      ...l.toObject(),
      uploader: profile ? {
        name: profile.name,
        photoUrl: profile.photoUrl,
        currentSkills: profile.currentSkills,
        skillsToLearn: profile.skillsToLearn,
        rating: profile.rating,
        numReviews: profile.numReviews,
        socialLinks: profile.socialLinks,
        showSocialLinks: profile.showSocialLinks,
      } : { name: 'You', photoUrl: '' }
    }));

    res.json(formattedListings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      'user',
      'name email'
    );

    if (listing) {
      res.json(listing);
    } else {
      res.status(404).json({ message: 'Listing not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedListing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await listing.deleteOne();
    res.json({ message: 'Listing removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createListing,
  getListings,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing,
};
