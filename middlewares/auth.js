const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Protect routes - check if user is logged in
exports.protect = catchAsync(async (req, res, next) => {
  try {
    // 1) Get token from header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4) Check if user is active
    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 401));
    }

    // 5) Check if user changed password after token was issued
    if (user.lastPasswordChange && user.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('User recently changed password! Please log in again.', 401));
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Authentication failed. Please log in again.', 401));
  }
});

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Check if user is logged in for frontend rendering
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  try {
    // 1) Get token from cookies
    const token = req.cookies.jwt;
    if (!token) return next();

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return next();

    // 4) Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) return next();

    // User is logged in
    res.locals.user = user;
    return next();
  } catch (err) {
    return next();
  }
});

// Rate limiting middleware
exports.rateLimit = (limit, minutes) => {
  const rateLimit = require('express-rate-limit');
  return rateLimit({
    max: limit,
    windowMs: minutes * 60 * 1000,
    message: `Too many requests from this IP, please try again in ${minutes} minutes!`,
  });
};

// Sanitize request body
exports.sanitizeBody = (req, res, next) => {
  const xss = require('xss-clean');
  xss(req, res, next);
};

// Prevent parameter pollution
exports.preventParamPollution = (req, res, next) => {
  const hpp = require('hpp');
  hpp()(req, res, next);
};
