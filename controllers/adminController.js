const User = require('../models/User');
const Biography = require('../models/Biography');
const Category = require('../models/Category');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Settings = require('../models/Settings');
const ApiKey = require('../models/ApiKey');
const Backup = require('../models/Backup');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');

// Dashboard Statistics
exports.getDashboardStats = catchAsync(async (req, res) => {
  const [
    totalUsers,
    totalBiographies,
    totalViews,
    activeCategories,
    usersTrend,
    biographiesTrend,
    viewsTrend
  ] = await Promise.all([
    User.countDocuments(),
    Biography.countDocuments(),
    Biography.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
    Category.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } }),
    Biography.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } }),
    Biography.aggregate([
      { $match: { updatedAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } } },
      { $group: { _id: null, views: { $sum: '$views' } } }
    ])
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalUsers,
      totalBiographies,
      totalViews: totalViews[0]?.totalViews || 0,
      activeCategories,
      usersTrend,
      biographiesTrend,
      viewsTrend: viewsTrend[0]?.views || 0
    }
  });
});

// Recent Activities
exports.getRecentActivities = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const activities = await Activity.find()
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .populate('user', 'username avatar');

  const total = await Activity.countDocuments();

  res.status(200).json({
    status: 'success',
    data: {
      activities,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

// User Management
exports.getUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc', role = '', status = '' } = req.query;

  // Build query
  let query = User.find();

  // Search functionality
  if (search) {
    query = query.or([
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]);
  }

  // Filter by role
  if (role) {
    query = query.where('role').equals(role);
  }

  // Filter by status
  if (status) {
    query = query.where('status').equals(status);
  }

  // Sort
  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  query = query.sort({ [sortBy]: sortDirection });

  // Pagination
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(Number(limit));

  // Execute query
  const [users, total] = await Promise.all([
    query.exec(),
    User.countDocuments(query.getFilter()),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      users,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

exports.getUserStats = catchAsync(async (req, res) => {
  const [totalUsers, activeUsers, inactiveUsers, suspendedUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'inactive' }),
    User.countDocuments({ status: 'suspended' })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      counts: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        suspended: suspendedUsers
      }
    }
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

exports.createUser = catchAsync(async (req, res) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    status: req.body.status || 'active',
  });

  // Remove password from output
  newUser.password = undefined;

  res.status(201).json({
    status: 'success',
    data: { user: newUser },
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  user.status = user.status === 'active' ? 'inactive' : 'active';
  await user.save();

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

exports.updateUserRole = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

exports.resetUserPassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Password reset token sent',
    resetToken, // In production, send this via email instead
  });
});

exports.inviteUser = catchAsync(async (req, res) => {
  const { email, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User already exists with that email', 400));
  }

  // Create user with temporary password
  const tempPassword = Math.random().toString(36).slice(-8);
  const newUser = await User.create({
    email,
    role,
    password: tempPassword,
    status: 'pending',
  });

  // In production, send invitation email with temporary password

  res.status(201).json({
    status: 'success',
    message: 'User invited successfully',
    data: {
      user: {
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    },
  });
});

// Category Management
exports.getCategories = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const skip = (page - 1) * limit;

  const searchQuery = search
    ? { name: { $regex: search, $options: 'i' } }
    : {};

  const [categories, total] = await Promise.all([
    Category.find(searchQuery)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    Category.countDocuments(searchQuery)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      categories,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

exports.createCategory = catchAsync(async (req, res) => {
  const newCategory = await Category.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { category: newCategory }
  });
});

exports.updateCategory = catchAsync(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!category) {
    throw new AppError('No category found with that ID', 404);
  }

  res.status(200).json({
    status: 'success',
    data: { category }
  });
});

exports.deleteCategory = catchAsync(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);

  if (!category) {
    throw new AppError('No category found with that ID', 404);
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getGeneralSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();
  
  res.status(200).json({
    status: 'success',
    data: settings?.general || {}
  });
});

exports.updateGeneralSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    {},
    { 'general': req.body },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: 'success',
    data: settings.general
  });
});

exports.getApiKeys = catchAsync(async (req, res) => {
  const apiKeys = await ApiKey.find()
    .select('+key')
    .sort('-createdAt');
  
  res.status(200).json({
    status: 'success',
    data: {
      apiKeys: apiKeys.map(key => ({
        id: key._id,
        name: key.name,
        key: key.key,
        status: key.status,
        permissions: key.permissions,
        createdAt: key.createdAt,
        lastUsed: key.lastUsed
      }))
    }
  });
});

exports.createApiKey = catchAsync(async (req, res) => {
  const { name, permissions, expiresIn } = req.body;
  
  const apiKey = await ApiKey.create({
    name,
    permissions,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : null,
    createdBy: req.user._id
  });

  res.status(201).json({
    status: 'success',
    data: {
      apiKey
    }
  });
});

exports.updateApiKey = catchAsync(async (req, res) => {
  const apiKey = await ApiKey.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!apiKey) {
    return next(new AppError('No API key found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      apiKey
    }
  });
});

exports.deleteApiKey = catchAsync(async (req, res) => {
  const apiKey = await ApiKey.findByIdAndDelete(req.params.id);

  if (!apiKey) {
    return next(new AppError('No API key found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getBackups = catchAsync(async (req, res) => {
  const backups = await Backup.find().sort('-createdAt');
  
  res.status(200).json({
    status: 'success',
    data: {
      backups
    }
  });
});

exports.createBackup = catchAsync(async (req, res) => {
  // Create backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.gz`;
  
  // Create backup using mongodump
  const backupPath = path.join(__dirname, '../backups', filename);
  
  try {
    await new Promise((resolve, reject) => {
      exec(`mongodump --uri="${process.env.DATABASE_URL}" --archive="${backupPath}" --gzip`, (error, stdout, stderr) => {
        if (error) reject(error);
        resolve(stdout);
      });
    });

    // Save backup record in database
    const backup = await Backup.create({
      filename,
      path: backupPath,
      createdBy: req.user._id,
      size: fs.statSync(backupPath).size,
    });

    res.status(201).json({
      status: 'success',
      data: {
        backup
      }
    });
  } catch (error) {
    // Clean up file if it was created
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    throw error;
  }
});

exports.restoreBackup = catchAsync(async (req, res, next) => {
  const backup = await Backup.findById(req.params.id);
  
  if (!backup) {
    return next(new AppError('No backup found with that ID', 404));
  }

  if (!fs.existsSync(backup.path)) {
    return next(new AppError('Backup file not found', 404));
  }

  try {
    await new Promise((resolve, reject) => {
      exec(`mongorestore --uri="${process.env.DATABASE_URL}" --archive="${backup.path}" --gzip --drop`, (error, stdout, stderr) => {
        if (error) reject(error);
        resolve(stdout);
      });
    });

    res.status(200).json({
      status: 'success',
      message: 'Database restored successfully'
    });
  } catch (error) {
    throw new AppError('Failed to restore backup: ' + error.message, 500);
  }
});

exports.deleteBackup = catchAsync(async (req, res, next) => {
  const backup = await Backup.findById(req.params.id);
  
  if (!backup) {
    return next(new AppError('No backup found with that ID', 404));
  }

  // Delete file if it exists
  if (fs.existsSync(backup.path)) {
    fs.unlinkSync(backup.path);
  }

  await backup.remove();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.revokeApiKey = catchAsync(async (req, res, next) => {
  const apiKey = await ApiKey.findById(req.params.id);
  
  if (!apiKey) {
    return next(new AppError('No API key found with that ID', 404));
  }

  apiKey.status = 'revoked';
  await apiKey.save();

  res.status(200).json({
    status: 'success',
    message: 'API key revoked successfully'
  });
});

exports.testEmailSettings = catchAsync(async (req, res) => {
  const { smtpHost, smtpPort, smtpUsername, smtpPassword } = req.body;

  // Create transporter with the provided settings
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUsername,
      pass: smtpPassword,
    },
  });

  // Verify the connection configuration
  await transporter.verify();

  // Send test email
  await transporter.sendMail({
    from: `"Admin" <${smtpUsername}>`,
    to: req.user.email, // Send to the current user's email
    subject: "Test Email",
    text: "This is a test email from your application.",
    html: "<b>This is a test email from your application.</b>",
  });

  res.status(200).json({
    status: 'success',
    message: 'Test email sent successfully'
  });
});

exports.getBackupSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();
  
  res.status(200).json({
    status: 'success',
    data: settings?.backup || {
      autoBackup: false,
      frequency: 'daily',
      retention: 7,
      lastBackup: null
    }
  });
});

exports.updateBackupSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    {},
    { 'backup': req.body },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: 'success',
    data: settings.backup
  });
});

exports.getSiteSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();
  
  res.status(200).json({
    status: 'success',
    data: settings?.site || {
      siteName: 'Biography Website',
      siteDescription: '',
      logo: '',
      favicon: '',
      theme: 'light',
      language: 'en',
      timezone: 'UTC'
    }
  });
});

exports.updateSiteSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    {},
    { 'site': req.body },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: 'success',
    data: settings.site
  });
});

exports.getEmailSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();
  
  res.status(200).json({
    status: 'success',
    data: settings?.email || {
      smtpHost: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      fromName: '',
      fromEmail: ''
    }
  });
});

exports.updateEmailSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    {},
    { 'email': req.body },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: 'success',
    data: settings.email
  });
});
