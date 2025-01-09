const Biography = require('../models/Biography');
const Category = require('../models/Category');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Get all biographies with filtering, sorting, and pagination
exports.getAllBiographies = catchAsync(async (req, res, next) => {
  // Build the query
  let query = Biography.find();

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query = query.or([
      { name: searchRegex },
      { shortDescription: searchRegex },
      { fullDescription: searchRegex },
      { tags: searchRegex }
    ]);
  }

  // Category filter
  if (req.query.category) {
    // Check if category is provided as a slug
    const category = await Category.findOne({ slug: req.query.category });
    if (!category) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        total: 0,
        data: {
          biographies: [],
        },
      });
    }
    query = query.where('category').equals(category._id);
  }

  // Featured filter
  if (req.query.featured) {
    query = query.where('featured').equals(req.query.featured === 'true');
  }

  // Count total documents before pagination
  const total = await Biography.countDocuments(query);

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // Populate references
  query = query
    .populate('category', 'name slug color')
    .populate('createdBy', 'name avatar')
    .populate('contributors', 'name avatar');

  // Execute query
  const biographies = await query;

  // Send response
  res.status(200).json({
    status: 'success',
    results: biographies.length,
    total,
    data: {
      biographies
    }
  });
});

// Get single biography
exports.getBiography = catchAsync(async (req, res, next) => {
  const biography = await Biography.findOne({ slug: req.params.slug })
    .populate('category')
    .populate('createdBy', 'name avatar')
    .populate('contributors', 'name avatar');

  if (!biography) {
    return next(new AppError('No biography found with that slug', 404));
  }

  // Increment views
  biography.views += 1;
  await biography.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

// Get a biography by slug
exports.getBiographyBySlug = catchAsync(async (req, res, next) => {
  const biography = await Biography.findOne({ slug: req.params.slug })
    .populate('category', 'name slug color')
    .populate('createdBy', 'name username avatar');

  if (!biography) {
    return next(new AppError('No biography found with that slug', 404));
  }

  // Increment views
  biography.views = (biography.views || 0) + 1;
  await biography.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

// Create a biography
exports.createBiography = catchAsync(async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    // Validate required fields
    const requiredFields = [
      'name',
      'shortDescription',
      'description',
      'birthDate',
      'birthPlace',
      'nationality',
      'category',
      'image',
      'profileImage'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields);
      return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
    }

    if (!req.user || !req.user._id) {
      return next(new AppError('User not authenticated', 401));
    }

    // Validate and format the data
    const biographyData = {
      ...req.body,
      createdBy: req.user._id,
      author: req.user._id,
      // Format arrays
      nationality: Array.isArray(req.body.nationality) ? 
                  req.body.nationality.filter(Boolean) : 
                  req.body.nationality ? [req.body.nationality] : [],
      occupation: Array.isArray(req.body.occupation) ? 
                 req.body.occupation.filter(Boolean) : 
                 req.body.occupation ? [req.body.occupation] : [],
      knownFor: Array.isArray(req.body.knownFor) ? req.body.knownFor.filter(Boolean) : 
                req.body.knownFor ? [req.body.knownFor] : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags.filter(Boolean) : 
            req.body.tags ? [req.body.tags] : [],
      // Format dates
      birthDate: new Date(req.body.birthDate),
      deathDate: req.body.deathDate ? new Date(req.body.deathDate) : undefined,
      // Filter gallery
      gallery: Array.isArray(req.body.gallery) ? 
               req.body.gallery.filter(item => item && item.url && item.url.trim() !== '') : []
    };

    console.log('Formatted data:', biographyData);

    // Create the biography
    const biography = await Biography.create(biographyData);

    console.log('Created biography:', biography);

    res.status(201).json({
      status: 'success',
      data: {
        biography
      }
    });
  } catch (error) {
    console.error('Error creating biography:', error);
    return next(new AppError(error.message || 'Error creating biography', 500));
  }
});

// Update biography
exports.updateBiography = catchAsync(async (req, res, next) => {
  // Handle arrays
  ['tags', 'occupation', 'knownFor', 'languages'].forEach(field => {
    if (typeof req.body[field] === 'string') {
      req.body[field] = req.body[field].split(',').map(item => item.trim());
    }
  });

  const biography = await Biography.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!biography) {
    return next(new AppError('No biography found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

// Delete biography
exports.deleteBiography = catchAsync(async (req, res, next) => {
  const biography = await Biography.findByIdAndDelete(req.params.id);

  if (!biography) {
    return next(new AppError('No biography found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Toggle featured status
exports.toggleFeatured = catchAsync(async (req, res, next) => {
  const biography = await Biography.findById(req.params.id);

  if (!biography) {
    return next(new AppError('No biography found with that ID', 404));
  }

  biography.featured = !biography.featured;
  await biography.save();

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

// Update featured order
exports.updateFeaturedOrder = catchAsync(async (req, res, next) => {
  const biography = await Biography.findById(req.params.id);

  if (!biography) {
    return next(new AppError('No biography found with that ID', 404));
  }

  biography.featuredOrder = req.body.featuredOrder;
  await biography.save();

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

// Like biography
exports.likeBiography = catchAsync(async (req, res, next) => {
  const biography = await Biography.findOne({ slug: req.params.slug });

  if (!biography) {
    return next(new AppError('No biography found with that slug', 404));
  }

  // Check if user has already liked
  if (!biography.likes.includes(req.user._id)) {
    biography.likes.push(req.user._id);
    await biography.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

// Bookmark biography
exports.bookmarkBiography = catchAsync(async (req, res, next) => {
  const biography = await Biography.findOne({ slug: req.params.slug });

  if (!biography) {
    return next(new AppError('No biography found with that slug', 404));
  }

  // Check if user has already bookmarked
  if (!biography.bookmarks.includes(req.user._id)) {
    biography.bookmarks.push(req.user._id);
    await biography.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

// Get related biographies
exports.getRelatedBiographies = catchAsync(async (req, res, next) => {
  const biography = await Biography.findById(req.params.id);

  if (!biography) {
    return next(new AppError('No biography found with that ID', 404));
  }

  const relatedBiographies = await Biography.find({
    category: biography.category,
    _id: { $ne: biography._id },
    status: 'published'
  })
    .limit(3)
    .select('name slug image shortDescription');

  res.status(200).json({
    status: 'success',
    data: {
      biographies: relatedBiographies
    }
  });
});

// Search biographies
exports.searchBiographies = catchAsync(async (req, res, next) => {
  const { q = '', page = 1, limit = 10 } = req.query;

  const searchQuery = {
    $text: { $search: q },
    status: 'published'
  };

  const [biographies, total] = await Promise.all([
    Biography.find(searchQuery)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('name slug image shortDescription')
      .sort({ score: { $meta: 'textScore' } }),
    Biography.countDocuments(searchQuery)
  ]);

  res.status(200).json({
    status: 'success',
    results: biographies.length,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    },
    data: {
      biographies
    }
  });
});

// Get biography statistics
exports.getBiographyStats = catchAsync(async (req, res, next) => {
  const stats = await Biography.aggregate([
    {
      $group: {
        _id: null,
        totalBiographies: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        totalBookmarks: { $sum: '$bookmarks' },
        avgAge: { $avg: { $subtract: ['$deathDate', '$birthDate'] } }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: stats[0]
    }
  });
});

// Get featured biographies
exports.getFeaturedBiographies = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 6;
  
  const biographies = await Biography.find({ featured: true })
    .sort('-createdAt')
    .limit(limit)
    .populate('category', 'name slug color')
    .select('name slug shortDescription birthDate deathDate profileImage category featured views likes');

  res.status(200).json({
    status: 'success',
    results: biographies.length,
    data: {
      biographies
    }
  });
});

// Get biographies by category
exports.getBiographiesByCategory = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const [biographies, total] = await Promise.all([
    Biography.find({ category: req.params.categoryId })
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('category', 'name slug')
      .populate('author', 'name username avatar')
      .select('title slug excerpt image stats category author createdAt'),
    Biography.countDocuments({ category: req.params.categoryId })
  ]);

  res.status(200).json({
    status: 'success',
    results: biographies.length,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
    data: {
      biographies
    }
  });
});

// Get biographies by author
exports.getBiographiesByAuthor = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const [biographies, total] = await Promise.all([
    Biography.find({ author: req.params.authorId })
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('category', 'name slug')
      .populate('author', 'name username avatar')
      .select('title slug excerpt image stats category author createdAt'),
    Biography.countDocuments({ author: req.params.authorId })
  ]);

  res.status(200).json({
    status: 'success',
    results: biographies.length,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
    data: {
      biographies
    }
  });
});

// Get all biographies for admin with filtering, sorting, and pagination
exports.getAdminBiographies = catchAsync(async (req, res) => {
  // Build the query
  const queryObj = {};

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    queryObj.$or = [
      { title: searchRegex },
      { name: searchRegex },
      { shortDescription: searchRegex },
      { description: searchRegex }
    ];
  }

  // Category filter
  if (req.query.category) {
    queryObj.category = req.query.category;
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Sort
  let sort = '-createdAt';
  if (req.query.sort) {
    sort = req.query.sort;
  }

  // Execute query
  const total = await Biography.countDocuments(queryObj);
  
  const biographies = await Biography.find(queryObj)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('category', 'name slug')
    .populate('createdBy', 'name email');

  // Send response
  res.status(200).json({
    status: 'success',
    page,
    limit,
    total,
    data: {
      biographies
    }
  });
});

// Get Biography of the Day
exports.getBiographyOfTheDay = catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let biographyOfTheDay = await Biography.findOne({
    biographyOfTheDay: true,
    biographyOfTheDayDate: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
    }
  })
  .populate('category')
  .populate('createdBy', 'name avatar')
  .populate('contributors', 'name avatar');

  // If no biography is set for today, get the latest one
  if (!biographyOfTheDay) {
    biographyOfTheDay = await Biography.findOne({
      biographyOfTheDay: true
    })
    .sort({ biographyOfTheDayDate: -1 })
    .populate('category')
    .populate('createdBy', 'name avatar')
    .populate('contributors', 'name avatar');
  }

  // If still no biography found, get a random featured biography
  if (!biographyOfTheDay) {
    const count = await Biography.countDocuments({ featured: true });
    const random = Math.floor(Math.random() * count);
    biographyOfTheDay = await Biography.findOne({ featured: true })
      .skip(random)
      .populate('category')
      .populate('createdBy', 'name avatar')
      .populate('contributors', 'name avatar');
  }

  // If still no biography found, get a random biography
  if (!biographyOfTheDay) {
    const count = await Biography.countDocuments();
    const random = Math.floor(Math.random() * count);
    biographyOfTheDay = await Biography.findOne()
      .skip(random)
      .populate('category')
      .populate('createdBy', 'name avatar')
      .populate('contributors', 'name avatar');
  }

  if (!biographyOfTheDay) {
    return res.status(404).json({
      status: 'error',
      message: 'No Biography of the Day found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      biography: biographyOfTheDay
    }
  });
});

// Set Biography of the Day
exports.setBiographyOfTheDay = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { date } = req.body;

  // First, unset any existing biography of the day for the same date
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const endDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

  await Biography.updateMany(
    {
      biographyOfTheDayDate: {
        $gte: targetDate,
        $lt: endDate
      }
    },
    {
      biographyOfTheDay: false,
      biographyOfTheDayDate: null
    }
  );

  // Set the new biography of the day
  const biography = await Biography.findByIdAndUpdate(
    id,
    {
      biographyOfTheDay: true,
      biographyOfTheDayDate: targetDate
    },
    {
      new: true,
      runValidators: true
    }
  ).populate('category');

  if (!biography) {
    return res.status(404).json({
      status: 'error',
      message: 'Biography not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

// Add missing controller functions for user interactions
exports.likeBiography = catchAsync(async (req, res, next) => {
  const biography = await Biography.findOne({ slug: req.params.slug });

  if (!biography) {
    return next(new AppError('No biography found with that slug', 404));
  }

  // Check if user has already liked
  if (!biography.likes.includes(req.user._id)) {
    biography.likes.push(req.user._id);
    await biography.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

exports.bookmarkBiography = catchAsync(async (req, res, next) => {
  const biography = await Biography.findOne({ slug: req.params.slug });

  if (!biography) {
    return next(new AppError('No biography found with that slug', 404));
  }

  // Check if user has already bookmarked
  if (!biography.bookmarks.includes(req.user._id)) {
    biography.bookmarks.push(req.user._id);
    await biography.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      biography
    }
  });
});

exports.addComment = catchAsync(async (req, res, next) => {
  const biography = await Biography.findOne({ slug: req.params.slug });

  if (!biography) {
    return next(new AppError('No biography found with that slug', 404));
  }

  const comment = {
    user: req.user._id,
    content: req.body.content,
    createdAt: new Date()
  };

  biography.comments.push(comment);
  await biography.save();

  res.status(201).json({
    status: 'success',
    data: {
      comment
    }
  });
});
