const Biography = require('../models/Biography');
const Category = require('../models/Category');
const User = require('../models/User');
const Activity = require('../models/Activity');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get overview statistics
exports.getOverviewStats = catchAsync(async (req, res, next) => {
  try {
    // Get current date and date 30 days ago
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const [
      totalBiographies,
      totalUsers,
      totalViewsResult,
      activeCategories,
      recentUsers,
      previousUsers,
      recentBiographies,
      previousBiographies,
      recentViews,
      previousViews
    ] = await Promise.all([
      Biography.countDocuments(),
      User.countDocuments(),
      Biography.aggregate([
        { 
          $group: { 
            _id: null, 
            total: { $sum: { $ifNull: ['$views', 0] } } 
          } 
        }
      ]),
      Category.countDocuments({ status: 'active' }),
      // Recent users (last 30 days)
      User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      }),
      // Previous users (30-60 days ago)
      User.countDocuments({
        createdAt: { 
          $gte: sixtyDaysAgo,
          $lt: thirtyDaysAgo
        }
      }),
      // Recent biographies (last 30 days)
      Biography.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      }),
      // Previous biographies (30-60 days ago)
      Biography.countDocuments({
        createdAt: { 
          $gte: sixtyDaysAgo,
          $lt: thirtyDaysAgo
        }
      }),
      // Recent views (last 30 days)
      Biography.aggregate([
        {
          $match: {
            updatedAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$views', 0] } }
          }
        }
      ]),
      // Previous views (30-60 days ago)
      Biography.aggregate([
        {
          $match: {
            updatedAt: { 
              $gte: sixtyDaysAgo,
              $lt: thirtyDaysAgo
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$views', 0] } }
          }
        }
      ])
    ]);

    // Calculate trends
    const calculateTrend = (recent, previous) => {
      recent = recent || 0;
      previous = previous || 0;
      if (previous === 0) return 0;
      return ((recent - previous) / previous) * 100;
    };

    res.status(200).json({
      status: 'success',
      data: {
        totalBiographies: totalBiographies || 0,
        totalUsers: totalUsers || 0,
        totalViews: totalViewsResult[0]?.total || 0,
        activeCategories: activeCategories || 0,
        usersTrend: calculateTrend(recentUsers, previousUsers),
        biographiesTrend: calculateTrend(recentBiographies, previousBiographies),
        viewsTrend: calculateTrend(
          recentViews[0]?.total || 0,
          previousViews[0]?.total || 0
        )
      }
    });
  } catch (error) {
    console.error('Error in getOverviewStats:', error);
    return next(new AppError('Error fetching dashboard statistics', 500));
  }
});

// Get activity logs
exports.getActivityLogs = catchAsync(async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find()
        .populate('user', 'name avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Activity.countDocuments()
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        activities: activities || [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error in getActivityLogs:', error);
    return next(new AppError('Error fetching activity logs', 500));
  }
});

// Get popular biographies
exports.getPopularBiographies = catchAsync(async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const biographies = await Biography.find()
      .sort({ views: -1, createdAt: -1 })
      .limit(limit)
      .select('title slug views likes createdAt category')
      .populate('category', 'name');

    res.status(200).json({
      status: 'success',
      data: biographies || []
    });
  } catch (error) {
    console.error('Error in getPopularBiographies:', error);
    return next(new AppError('Error fetching popular biographies', 500));
  }
});

// Get user statistics
exports.getUserStats = catchAsync(async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsers,
      usersByRole
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLoginAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        new: newUsers || 0,
        byRole: usersByRole.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error in getUserStats:', error);
    return next(new AppError('Error fetching user statistics', 500));
  }
});
