const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A plan must have a name'],
    trim: true,
    maxlength: [50, 'Plan name cannot exceed 50 characters'],
  },
  description: {
    type: String,
    required: [true, 'A plan must have a description'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'A plan must have a price'],
    min: [0, 'Price cannot be negative'],
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP'],
  },
  billingCycle: {
    type: String,
    enum: ['once', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'],
    default: 'monthly',
  },
  features: [{
    type: String,
    required: true,
    trim: true,
  }],
  isPopular: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
  },
  order: {
    type: Number,
    default: 0,
  },
  serviceId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Service',
    required: true,
  },
  metadata: {
    customFields: Map,
    discountCode: String,
    maxSubscribers: Number,
  },
  stats: {
    subscriptions: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
pricingPlanSchema.index({ serviceId: 1, status: 1 });
pricingPlanSchema.index({ order: 1 });
pricingPlanSchema.index({ 'stats.subscriptions': -1 });

// Methods
pricingPlanSchema.methods.incrementStats = async function(type, amount = 1) {
  if (type === 'subscriptions') {
    this.stats.subscriptions += amount;
  } else if (type === 'revenue') {
    this.stats.revenue += amount;
  }
  return this.save({ validateBeforeSave: false });
};

const PricingPlan = mongoose.model('PricingPlan', pricingPlanSchema);

module.exports = PricingPlan;
