const mongoose = require('mongoose');
const crypto = require('crypto');

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
      'Please provide a valid email address',
    ],
  },
  name: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['subscribed', 'unsubscribed', 'pending', 'bounced'],
    default: 'pending',
  },
  verificationToken: String,
  verificationExpires: Date,
  unsubscribeToken: String,
  preferences: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly',
    },
    categories: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
    }],
  },
  lastEmailSent: Date,
  bounceCount: {
    type: Number,
    default: 0,
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: String,
  },
}, {
  timestamps: true,
});

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a campaign title'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  subject: {
    type: String,
    required: [true, 'Please provide an email subject'],
    trim: true,
    minlength: [3, 'Subject must be at least 3 characters long'],
    maxlength: [100, 'Subject cannot exceed 100 characters'],
  },
  content: {
    type: String,
    required: [true, 'Please provide campaign content'],
    minlength: [10, 'Content must be at least 10 characters long'],
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
    default: 'draft',
  },
  scheduledFor: Date,
  sentAt: Date,
  targetAudience: {
    status: [String],
    categories: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
    }],
    frequency: [String],
  },
  stats: {
    totalRecipients: {
      type: Number,
      default: 0,
    },
    sent: {
      type: Number,
      default: 0,
    },
    delivered: {
      type: Number,
      default: 0,
    },
    opened: {
      type: Number,
      default: 0,
    },
    clicked: {
      type: Number,
      default: 0,
    },
    bounced: {
      type: Number,
      default: 0,
    },
    unsubscribed: {
      type: Number,
      default: 0,
    },
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
subscriberSchema.index({ email: 1 }, { unique: true });
subscriberSchema.index({ status: 1 });
subscriberSchema.index({ verificationToken: 1 });
subscriberSchema.index({ unsubscribeToken: 1 });

campaignSchema.index({ status: 1, scheduledFor: 1 });
campaignSchema.index({ createdAt: -1 });

// Generate verification token
subscriberSchema.methods.createVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Generate unsubscribe token
subscriberSchema.methods.createUnsubscribeToken = function() {
  const unsubscribeToken = crypto.randomBytes(32).toString('hex');
  
  this.unsubscribeToken = crypto
    .createHash('sha256')
    .update(unsubscribeToken)
    .digest('hex');
    
  return unsubscribeToken;
};

// Pre-save middleware for subscriber
subscriberSchema.pre('save', function(next) {
  if (!this.unsubscribeToken) {
    this.createUnsubscribeToken();
  }
  next();
});

// Campaign methods
campaignSchema.methods.updateStats = async function(stats) {
  Object.keys(stats).forEach(key => {
    if (this.stats[key] !== undefined) {
      this.stats[key] += stats[key];
    }
  });
  return this.save();
};

const Subscriber = mongoose.model('Subscriber', subscriberSchema);
const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = {
  Subscriber,
  Campaign,
};
