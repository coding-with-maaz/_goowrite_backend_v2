const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A category must have a name'],
      unique: true,
      trim: true,
      maxlength: [50, 'Category name cannot be more than 50 characters'],
    },
    slug: String,
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    icon: {
      type: String,
      default: 'FaBook',
    },
    color: {
      type: String,
      default: 'bg-blue-500',
    },
    parent: {
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
      default: null,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    seoTitle: String,
    seoDescription: String,
    seoKeywords: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ featured: 1 });
categorySchema.index({ name: 'text', description: 'text' });

// Create slug from name before saving
categorySchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  this.updatedAt = Date.now();
  next();
});

// Query middleware
categorySchema.pre(/^find/, function(next) {
  this.populate({
    path: 'parent',
    select: 'name slug',
  });
  next();
});

// Virtual populate
categorySchema.virtual('biographies', {
  ref: 'Biography',
  foreignField: 'category',
  localField: '_id',
});

categorySchema.virtual('children', {
  ref: 'Category',
  foreignField: 'parent',
  localField: '_id',
});

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function () {
  const categories = await this.find()
    .populate({
      path: 'children',
      select: 'name slug icon color order',
      populate: {
        path: 'children',
        select: 'name slug icon color order',
      },
    })
    .where({ parent: null })
    .sort('order');

  return categories;
};

// Static method to get category stats
categorySchema.statics.getCategoryStats = async function () {
  return await this.aggregate([
    {
      $lookup: {
        from: 'biographies',
        localField: '_id',
        foreignField: 'category',
        as: 'biographies',
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        icon: 1,
        color: 1,
        biographyCount: { $size: '$biographies' },
      },
    },
    {
      $sort: { biographyCount: -1 },
    },
  ]);
};

// Instance method to toggle featured status
categorySchema.methods.toggleFeatured = async function () {
  this.featured = !this.featured;
  await this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('Category', categorySchema);
