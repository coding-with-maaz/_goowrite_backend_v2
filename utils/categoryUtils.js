const slugify = require('slugify');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const AppError = require('./appError');

// Generate unique slug for category
exports.generateSlug = async (name, Category) => {
  let slug = slugify(name, { lower: true, strict: true });
  let counter = 1;
  let exists = await Category.findOne({ slug });

  while (exists) {
    slug = slugify(`${name}-${counter}`, { lower: true, strict: true });
    exists = await Category.findOne({ slug });
    counter++;
  }

  return slug;
};

// Process and optimize category images
exports.processImage = async (file, options = {}) => {
  const {
    width = 600,
    height = 400,
    quality = 80,
    format = 'jpeg',
  } = options;

  const filename = `category-${Date.now()}.${format}`;
  const uploadPath = path.join('public', 'uploads', 'categories', filename);

  await sharp(file.buffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .toFormat(format)
    .jpeg({ quality })
    .toFile(uploadPath);

  return filename;
};

// Clean up old images
exports.cleanupOldImages = async (oldImagePath) => {
  try {
    if (!oldImagePath) return;
    const fullPath = path.join('public', 'uploads', 'categories', oldImagePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting old image:', error);
  }
};

// Validate category data
exports.validateCategoryData = (data) => {
  const errors = [];

  if (!data.name || data.name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (data.description && data.description.length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }

  if (data.order && (!Number.isInteger(data.order) || data.order < 0)) {
    errors.push('Order must be a positive integer');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }
};

// Format category for API response
exports.formatCategoryResponse = (category) => {
  return {
    id: category._id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    featured: category.featured,
    order: category.order,
    stats: {
      biographyCount: category.stats.biographyCount,
      viewCount: category.stats.viewCount,
    },
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

// Calculate category statistics
exports.calculateCategoryStats = async (categoryId, Biography) => {
  const stats = await Biography.aggregate([
    { $match: { category: categoryId } },
    {
      $group: {
        _id: null,
        biographyCount: { $sum: 1 },
        totalViews: { $sum: '$stats.views' },
        totalLikes: { $sum: { $size: '$likes' } },
        totalComments: { $sum: { $size: '$comments' } },
      },
    },
  ]);

  return stats.length > 0
    ? {
        biographyCount: stats[0].biographyCount,
        viewCount: stats[0].totalViews,
        likeCount: stats[0].totalLikes,
        commentCount: stats[0].totalComments,
      }
    : {
        biographyCount: 0,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
      };
};

// Get category hierarchy
exports.getCategoryHierarchy = async (Category) => {
  const categories = await Category.find().sort('order name');
  return categories.map(cat => ({
    id: cat._id,
    name: cat.name,
    slug: cat.slug,
    order: cat.order,
  }));
};

// Update category order
exports.updateCategoryOrder = async (categories, Category) => {
  const bulkOps = categories.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { order } },
    },
  }));

  await Category.bulkWrite(bulkOps);
};

// Get related categories
exports.getRelatedCategories = async (categoryId, limit = 3, Category, Biography) => {
  const category = await Category.findById(categoryId);
  if (!category) return [];

  const relatedBiographies = await Biography.find({ category: categoryId })
    .distinct('tags');

  return await Category.aggregate([
    { $match: { _id: { $ne: categoryId } } },
    {
      $lookup: {
        from: 'biographies',
        localField: '_id',
        foreignField: 'category',
        as: 'biographies',
      },
    },
    { $unwind: '$biographies' },
    { $match: { 'biographies.tags': { $in: relatedBiographies } } },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        slug: { $first: '$slug' },
        image: { $first: '$image' },
        matchCount: { $sum: 1 },
      },
    },
    { $sort: { matchCount: -1 } },
    { $limit: limit },
  ]);
};
