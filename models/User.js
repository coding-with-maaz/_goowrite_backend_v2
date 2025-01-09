const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
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

const User = mongoose.model('User', userSchema);
module.exports = User;
