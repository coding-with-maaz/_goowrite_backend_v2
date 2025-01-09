const Biography = require('../models/Biography');
const Category = require('../models/Category');
const Settings = require('../models/Settings');
const Activity = require('../models/Activity');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get featured biographies
exports.getFeaturedBiographies = catchAsync(async (req, res, next) => {
  const settings = await Settings.findOne();
  const limit = settings?.homepage?.featuredBiographiesCount || 6;

  const featuredBiographies = await Biography.find({ featured: true })
    .sort('-createdAt')
    .limit(limit)
    .populate('category', 'name slug')
    .select('title slug excerpt image stats category createdAt');

  res.status(200).json({
    status: 'success',
    results: featuredBiographies.length,
    data: {
      biographies: featuredBiographies,
    },
  });
});

// Get biography of the day
exports.getBiographyOfDay = catchAsync(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // First try to find today's biography
  let biographyOfDay = await Biography.findOne({
    'biographyOfDay.date': today,
  })
    .populate('category', 'name slug')
    .select('title slug excerpt image stats category createdAt');

  // If no biography is set for today, try to get a random featured one
  if (!biographyOfDay) {
    const featuredCount = await Biography.countDocuments({ featured: true });
    
    if (featuredCount === 0) {
      // If no featured biographies, get a random one from all biographies
      const totalCount = await Biography.countDocuments();
      
      if (totalCount === 0) {
        return res.status(200).json({
          status: 'success',
          data: {
            biography: null,
            message: 'No biographies available',
          },
        });
      }

      const random = Math.floor(Math.random() * totalCount);
      biographyOfDay = await Biography.findOne()
        .skip(random)
        .populate('category', 'name slug')
        .select('title slug excerpt image stats category createdAt');
    } else {
      // Get a random featured biography
      const random = Math.floor(Math.random() * featuredCount);
      biographyOfDay = await Biography.findOne({ featured: true })
        .skip(random)
        .populate('category', 'name slug')
        .select('title slug excerpt image stats category createdAt');
    }

    // Only try to update if we found a biography
    if (biographyOfDay) {
      await Biography.findByIdAndUpdate(biographyOfDay._id, {
        biographyOfDay: {
          date: today,
          reason: 'Randomly selected biography',
        },
      });
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      biography: biographyOfDay,
      message: biographyOfDay ? undefined : 'No biographies available',
    },
  });
});

// Get historical timeline
exports.getHistoricalTimeline = catchAsync(async (req, res, next) => {
  const { limit = 10, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  const timeline = await Biography.find({ 'timeline.date': { $exists: true } })
    .sort('timeline.date')
    .skip(skip)
    .limit(limit)
    .select('title slug timeline.date timeline.event image')
    .lean();

  const total = await Biography.countDocuments({ 'timeline.date': { $exists: true } });

  res.status(200).json({
    status: 'success',
    results: timeline.length,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
    data: {
      timeline,
    },
  });
});

// Get categories
exports.getCategories = catchAsync(async (req, res, next) => {
  const { featured } = req.query;
  const query = featured ? { featured: true } : {};

  const categories = await Category.find(query)
    .sort('order name')
    .select('name slug description image stats featured');

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

// Get site statistics
exports.getSiteStats = catchAsync(async (req, res, next) => {
  const stats = await Promise.all([
    Biography.countDocuments(),
    Category.countDocuments(),
    Biography.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$stats.views' },
          totalLikes: { $sum: { $size: '$likes' } },
          totalComments: { $sum: { $size: '$comments' } },
        },
      },
    ]),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        biographiesCount: stats[0],
        categoriesCount: stats[1],
        totalViews: stats[2][0]?.totalViews || 0,
        totalLikes: stats[2][0]?.totalLikes || 0,
        totalComments: stats[2][0]?.totalComments || 0,
      },
    },
  });
});

// Get recent activities
exports.getRecentActivities = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const activities = await Activity.find()
    .sort('-createdAt')
    .limit(limit)
    .populate('user', 'name avatar')
    .select('action entityType entityId createdAt user');

  res.status(200).json({
    status: 'success',
    results: activities.length,
    data: {
      activities,
    },
  });
});

// Site search
exports.getSiteSearch = catchAsync(async (req, res, next) => {
  const { q, type, limit = 10, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  if (!q) {
    return next(new AppError('Please provide a search query', 400));
  }

  const searchQuery = {
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } },
      { excerpt: { $regex: q, $options: 'i' } },
    ],
  };

  if (type) {
    searchQuery.type = type;
  }

  const [results, total] = await Promise.all([
    Biography.find(searchQuery)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name slug')
      .select('title slug excerpt image stats category createdAt')
      .lean(),
    Biography.countDocuments(searchQuery),
  ]);

  res.status(200).json({
    status: 'success',
    results: results.length,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
    data: {
      results,
    },
  });
});
