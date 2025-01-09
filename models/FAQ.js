const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'A FAQ must have a question'],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, 'A FAQ must have an answer'],
  },
  category: {
    type: String,
    required: [true, 'A FAQ must have a category'],
    enum: ['general', 'account', 'billing', 'technical', 'content', 'other'],
    default: 'general',
  },
  active: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Update the updatedAt timestamp before saving
faqSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FAQ', faqSchema);
