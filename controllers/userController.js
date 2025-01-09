const User = require('../models/User');
const Activity = require('../models/Activity');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Get all users with filters, sorting, and pagination
exports.getAllUsers = catchAsync(async (req, res) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [users, total] = await Promise.all([
    features.query,
    User.countDocuments(features.filterObj),
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    total,
    data: {
      users,
    },
  });
});

// Get single user
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .populate('biographies')
    .populate('activities');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Create user (admin only)
exports.createUser = catchAsync(async (req, res) => {
  const user = await User.create({
    ...req.body,
    createdBy: req.user.id,
  });

  // Log activity
  await Activity.create({
    user: req.user.id,
    action: 'create_user',
    details: `Created user ${user.username}`,
    target: user._id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Update user
exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  // Prevent password update through this route
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates. Please use /updatePassword.', 400));
  }

  // Update user
  Object.assign(user, req.body);
  await user.save({ validateBeforeSave: false });

  // Log activity
  await Activity.create({
    user: req.user.id,
    action: 'update_user',
    details: `Updated user ${user.username}`,
    target: user._id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Delete user
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  // Check if user has any biographies
  const hasBiographies = await User.exists({ 'biographies.0': { $exists: true } });
  if (hasBiographies) {
    return next(new AppError('Cannot delete user with biographies. Please reassign or delete biographies first.', 400));
  }

  await user.deleteOne();

  // Log activity
  await Activity.create({
    user: req.user.id,
    action: 'delete_user',
    details: `Deleted user ${user.username}`,
    target: user._id,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get user stats
exports.getUserStats = catchAsync(async (req, res) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

// Get user activities
exports.getUserActivities = catchAsync(async (req, res) => {
  const activities = await Activity.find({ user: req.params.id })
    .sort('-createdAt')
    .limit(parseInt(req.query.limit) || 10);

  res.status(200).json({
    status: 'success',
    results: activities.length,
    data: {
      activities,
    },
  });
});

// Toggle user status
exports.toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  // Log activity
  await Activity.create({
    user: req.user.id,
    action: 'toggle_user_status',
    details: `${user.isActive ? 'Activated' : 'Deactivated'} user ${user.username}`,
    target: user._id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Update user role
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  // Prevent self-role update
  if (user.id === req.user.id) {
    return next(new AppError('You cannot change your own role', 403));
  }

  user.role = req.body.role;
  await user.save({ validateBeforeSave: false });

  // Log activity
  await Activity.create({
    user: req.user.id,
    action: 'update_user_role',
    details: `Updated ${user.username}'s role to ${user.role}`,
    target: user._id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Search users
exports.searchUsers = catchAsync(async (req, res) => {
  const { query } = req.query;
  
  const users = await User.find(
    {
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
      ],
    },
    '-password'
  ).limit(10);

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});
