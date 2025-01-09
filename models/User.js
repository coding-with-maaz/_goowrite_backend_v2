const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide your first name'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Please provide your last name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  avatar: {
    type: String,
    default: '',
  },
  banner: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
  },
  socialLinks: {
    twitter: String,
    linkedin: String,
    github: String,
    website: String,
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
}, {
  timestamps: true,
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password - renamed from comparePassword to correctPassword
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove all indexes before creating the model
mongoose.connection.on('connected', async () => {
  try {
    await mongoose.connection.collection('users').dropIndexes();
    console.log('Dropped all indexes from users collection');
  } catch (error) {
    console.error('Error dropping indexes:', error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
