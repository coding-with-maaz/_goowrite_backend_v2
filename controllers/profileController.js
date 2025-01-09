const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validator = require('validator');

exports.getProfile = catchAsync(async (req, res, next) => {
  try {
    console.log('Request user:', req.user);

    // Check if user exists in request
    if (!req.user) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // Changed the select statement to properly handle password exclusion
    const user = await User.findById(req.user._id)
      .select('-password'); // Use exclusion instead of mixing inclusion and exclusion

    console.log('Found user in getProfile:', user);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          location: user.location,
          bio: user.bio,
          socialLinks: user.socialLinks,
          role: user.role,
          username: user.username,
          isActive: user.isActive,
          status: user.status,
          preferences: user.preferences,
          stats: user.stats,
          lastLogin: user.lastLogin,
        }
      }
    });
  } catch (error) {
    console.error('GetProfile Error:', error);
    return next(new AppError('Error fetching profile', 500));
  }
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  // Check if user exists in request
  if (!req.user) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates.', 400));
  }

  // 2) Filter unwanted fields
  const filteredBody = filterObj(req.body,
    'firstName',
    'lastName',
    'email',
    'phone',
    'location',
    'bio',
    'avatar',
    'banner',
    'socialLinks',
    'username'
  );

  // 3) Validate the data
  if (filteredBody.email && !validator.isEmail(filteredBody.email)) {
    return next(new AppError('Please provide a valid email', 400));
  }

  try {
    // 4) Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Update Error:', error);
    return next(new AppError('Error updating profile', 500));
  }
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
}; 