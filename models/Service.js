const mongoose = require('mongoose');
const slugify = require('slugify');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A service must have a title'],
    trim: true,
    unique: true,
    maxlength: [100, 'Service title cannot exceed 100 characters'],
    minlength: [3, 'Service title must be at least 3 characters'],
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'A service must have a description'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
  },
  shortDescription: {
    type: String,
    required: [true, 'A service must have a short description'],
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters'],
  },
  image: {
    type: String,
    required: [true, 'A service must have an image'],
  },
  icon: {
    type: String,
    required: [true, 'A service must have an icon'],
  },
  features: [{
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    icon: String,
  }],
  pricing: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP'],
    },
    interval: {
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
  }],
  faqs: [{
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
  }],
  category: {
    type: String,
    required: [true, 'A service must belong to a category'],
    enum: ['Writing', 'Research', 'Editing', 'Consulting', 'Other'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'coming-soon'],
    default: 'active',
  },
  order: {
    type: Number,
    default: 0,
  },
  stats: {
    views: {
      type: Number,
      default: 0,
    },
    inquiries: {
      type: Number,
      default: 0,
    },
    conversions: {
      type: Number,
      default: 0,
    },
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
serviceSchema.index({ slug: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ order: 1 });
serviceSchema.index({ 'stats.views': -1 });

// Virtual populate
serviceSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'service',
  localField: '_id',
});

// Document middleware
serviceSchema.pre('save', function(next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

// Query middleware
serviceSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'createdBy',
    select: 'name email',
  });
  next();
});

// Instance methods
serviceSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  return this.save({ validateBeforeSave: false });
};

serviceSchema.methods.incrementInquiries = async function() {
  this.stats.inquiries += 1;
  return this.save({ validateBeforeSave: false });
};

serviceSchema.methods.incrementConversions = async function() {
  this.stats.conversions += 1;
  return this.save({ validateBeforeSave: false });
};

// Static methods
serviceSchema.statics.getServiceStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgViews: { $avg: '$stats.views' },
        totalInquiries: { $sum: '$stats.inquiries' },
        totalConversions: { $sum: '$stats.conversions' },
      },
    },
  ]);
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
