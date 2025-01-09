const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load env vars
dotenv.config({ path: path.join(__dirname, 'config.env') });

// Load models
const User = require('../models/User');
const Category = require('../models/Category');
const Biography = require('../models/Biography');

// Connect to DB
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Sample data
const users = [
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    isActive: true,
  },
  {
    username: 'user1',
    email: 'user1@example.com',
    password: 'user123',
    role: 'user',
    isActive: true,
  },
];

const categories = [
  {
    name: 'Scientists',
    description: 'Famous scientists and their contributions',
    isActive: true,
  },
  {
    name: 'Artists',
    description: 'Renowned artists and their works',
    isActive: true,
  },
  {
    name: 'Leaders',
    description: 'Historical leaders and their impact',
    isActive: true,
  },
];

// Import data into DB
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Biography.deleteMany();

    console.log('Data cleared...');

    // Create new data
    await User.create(users);
    await Category.create(categories);

    console.log('Data imported...');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete all data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Category.deleteMany();
    await Biography.deleteMany();

    console.log('Data destroyed...');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Handle command line arguments
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
}
