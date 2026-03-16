const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Profile = require('./models/Profile');
const Listing = require('./models/Listing');

// Load env vars
dotenv.config();

const users = [
  {
    name: 'Alice Cooper',
    email: 'alice@example.com',
    password: 'password123',
    credits: 10,
    skillsToTeach: ['React', 'JavaScript', 'Frontend Design'],
    skillsToLearn: ['Python', 'Cooking'],
    listings: [
      {
        type: 'TEACH',
        skillName: 'Advanced React Patterns',
        description: 'I will teach you how to build scalable React applications using advanced patterns like HOCs, Render Props, and custom Hooks.',
        method: 'CREDITS',
        creditsPerHour: 2,
        availability: 'Weekends'
      }
    ]
  },
  {
    name: 'Bob Builder',
    email: 'bob@example.com',
    password: 'password123',
    credits: 5,
    skillsToTeach: ['Python', 'Data Science'],
    skillsToLearn: ['React', 'UI/UX'],
    listings: [
      {
        type: 'TEACH',
        skillName: 'Intro to Data Science with Python',
        description: 'Learn Pandas, NumPy, and Scikit-learn from scratch. Perfect for beginners.',
        method: 'BARTER',
        barterSkills: ['React', 'JavaScript', 'UI/UX'],
        availability: 'Evenings EST'
      }
    ]
  },
  {
    name: 'Charlie Chef',
    email: 'charlie@example.com',
    password: 'password123',
    credits: 0,
    skillsToTeach: ['Cooking', 'Baking', 'French Cuisine'],
    skillsToLearn: ['Digital Marketing', 'Photography'],
    listings: [
      {
        type: 'LEARN',
        skillName: 'Product Photography',
        description: 'I need someone to teach me how to take professional photos of my bakery items for Instagram.',
        method: 'BOTH',
        barterSkills: ['Cooking', 'Baking'],
        creditsPerHour: 1,
        availability: 'Tuesday mornings'
      }
    ]
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    await User.deleteMany();
    await Profile.deleteMany();
    await Listing.deleteMany();
    console.log('Cleared existing data.');

    for (const u of users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);

      const user = await User.create({
        email: u.email,
        passwordHash: hashedPassword,
        credits: u.credits
      });

      await Profile.create({
        user: user._id,
        name: u.name,
        currentSkills: u.skillsToTeach,
        skillsToLearn: u.skillsToLearn
      });

      for (const list of u.listings) {
        await Listing.create({
          user: user._id,
          type: list.type,
          skillName: list.skillName,
          description: list.description,
          method: list.method,
          barterSkills: list.barterSkills || [],
          creditsPerHour: list.creditsPerHour || 0,
          availability: list.availability,
          active: true
        });
      }
    }

    console.log('Seed Complete!');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedDB();
