const Category = require('../models/Category');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Get all categories
exports.getAllCategories = catchAsync(async (req, res) => {
  const features = new APIFeatures(Category.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [categories, total] = await Promise.all([
    features.query,
    Category.countDocuments(features.filterObj),
  ]);

  res.status(200).json({
    status: 'success',
    results: categories.length,
    total,
    data: {
      categories,
    },
  });
});

// Get category tree
exports.getCategoryTree = catchAsync(async (req, res) => {
  const categories = await Category.getCategoryTree();

  res.status(200).json({
    status: 'success',
    data: {
      categories,
    },
  });
});

// Get single category
exports.getCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let query;

  // Check if the id is a valid MongoDB ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    query = Category.findById(id);
  } else {
    // If not a valid ObjectId, assume it's a slug
    query = Category.findOne({ slug: id });
  }

  const category = await query
    .populate('children')
    .populate('biographies');

  if (!category) {
    return next(new AppError('No category found with that ID or slug', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

// Create category
exports.createCategory = catchAsync(async (req, res) => {
  const category = await Category.create({
    ...req.body,
    createdBy: req.user.id,
    updatedBy: req.user.id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      category,
    },
  });
});

// Update category
exports.updateCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let query;

  // Check if the id is a valid MongoDB ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    query = Category.findById(id);
  } else {
    // If not a valid ObjectId, assume it's a slug
    query = Category.findOne({ slug: id });
  }

  const category = await query;

  if (!category) {
    return next(new AppError('No category found with that ID or slug', 404));
  }

  // Check if trying to set parent to self
  if (req.body.parent && req.body.parent.toString() === id) {
    return next(new AppError('Category cannot be its own parent', 400));
  }

  // Update the category
  Object.assign(category, {
    ...req.body,
    updatedBy: req.user.id,
    updatedAt: Date.now(),
  });

  await category.save();

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

// Delete category
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let query;

  // Check if the id is a valid MongoDB ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    query = Category.findById(id);
  } else {
    // If not a valid ObjectId, assume it's a slug
    query = Category.findOne({ slug: id });
  }

  const category = await query;

  if (!category) {
    return next(new AppError('No category found with that ID or slug', 404));
  }

  // Check if category has children
  const hasChildren = await Category.exists({ parent: category._id });
  if (hasChildren) {
    return next(new AppError('Cannot delete category with subcategories. Please delete or move subcategories first.', 400));
  }

  // Check if category has biographies
  const hasBiographies = await Category.exists({ 'biographies.0': { $exists: true } });
  if (hasBiographies) {
    return next(new AppError('Cannot delete category with biographies. Please move or delete biographies first.', 400));
  }

  await category.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Toggle featured status
exports.toggleFeatured = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let query;

  // Check if the id is a valid MongoDB ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    query = Category.findById(id);
  } else {
    // If not a valid ObjectId, assume it's a slug
    query = Category.findOne({ slug: id });
  }

  const category = await query;

  if (!category) {
    return next(new AppError('No category found with that ID or slug', 404));
  }

  await category.toggleFeatured();

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

// Get category stats
exports.getCategoryStats = catchAsync(async (req, res) => {
  const stats = await Category.getCategoryStats();

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

// Search categories
exports.searchCategories = catchAsync(async (req, res) => {
  const { query } = req.query;
  
  const categories = await Category.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(10);

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

// Get featured categories
exports.getFeaturedCategories = catchAsync(async (req, res) => {
  const categories = await Category.find({ featured: true })
    .sort('order')
    .limit(10);

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

// Reorder categories
exports.reorderCategories = catchAsync(async (req, res, next) => {
  const { orders } = req.body;

  if (!Array.isArray(orders)) {
    return next(new AppError('Orders must be an array of {id, order} objects', 400));
  }

  const updatePromises = orders.map(({ id, order }) =>
    Category.findByIdAndUpdate(id, { order }, { new: true })
  );

  const categories = await Promise.all(updatePromises);

  res.status(200).json({
    status: 'success',
    data: {
      categories,
    },
  });
});
