const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A pricing plan must have a name'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'A pricing plan must have a description'],
  },
  price: {
    type: Number,
    required: [true, 'A pricing plan must have a price'],
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },
  features: [{
    text: {
      type: String,
      required: [true, 'A feature must have text'],
    },
    included: {
      type: Boolean,
      default: true,
    }
  }],
  recommended: {
    type: Boolean,
    default: false,
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
pricingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Pricing', pricingSchema);
