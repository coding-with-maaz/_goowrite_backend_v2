const Settings = require('../models/Settings');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { clearCache } = require('../utils/cache');

// Get all settings
exports.getSettings = catchAsync(async (req, res) => {
  let settings = await Settings.findOne()
    .populate('updatedBy', 'username');

  // If no settings exist, create default settings
  if (!settings) {
    settings = await Settings.create({
      siteName: 'Biographies Website',
      updatedBy: req.user.id,
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      settings,
    },
  });
});

// Update settings
exports.updateSettings = catchAsync(async (req, res, next) => {
  const settings = await Settings.findOne();

  if (!settings) {
    return next(new AppError('Settings not found', 404));
  }

  // Update settings
  Object.assign(settings, {
    ...req.body,
    updatedBy: req.user.id,
  });

  await settings.save();

  // Clear cache after settings update
  await clearCache('settings');

  res.status(200).json({
    status: 'success',
    data: {
      settings,
    },
  });
});

// Get theme settings
exports.getThemeSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne().select('theme');

  res.status(200).json({
    status: 'success',
    data: {
      theme: settings?.theme || {},
    },
  });
});

// Update theme settings
exports.updateThemeSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();

  settings.theme = {
    ...settings.theme,
    ...req.body,
  };
  settings.updatedBy = req.user.id;

  await settings.save();
  await clearCache('settings:theme');

  res.status(200).json({
    status: 'success',
    data: {
      theme: settings.theme,
    },
  });
});

// Get SEO settings
exports.getSeoSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne().select('seo');

  res.status(200).json({
    status: 'success',
    data: {
      seo: settings?.seo || {},
    },
  });
});

// Update SEO settings
exports.updateSeoSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();

  settings.seo = {
    ...settings.seo,
    ...req.body,
  };
  settings.updatedBy = req.user.id;

  await settings.save();
  await clearCache('settings:seo');

  res.status(200).json({
    status: 'success',
    data: {
      seo: settings.seo,
    },
  });
});

// Get email settings
exports.getEmailSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne().select('email');

  // Remove sensitive information
  const email = settings?.email || {};
  delete email.smtpPass;

  res.status(200).json({
    status: 'success',
    data: {
      email,
    },
  });
});

// Update email settings
exports.updateEmailSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();

  settings.email = {
    ...settings.email,
    ...req.body,
  };
  settings.updatedBy = req.user.id;

  await settings.save();
  await clearCache('settings:email');

  // Remove sensitive information from response
  const email = settings.email;
  delete email.smtpPass;

  res.status(200).json({
    status: 'success',
    data: {
      email,
    },
  });
});

// Toggle maintenance mode
exports.toggleMaintenanceMode = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();

  settings.maintenance.enabled = !settings.maintenance.enabled;
  if (req.body.message) {
    settings.maintenance.message = req.body.message;
  }
  settings.updatedBy = req.user.id;

  await settings.save();
  await clearCache('settings:maintenance');

  res.status(200).json({
    status: 'success',
    data: {
      maintenance: settings.maintenance,
    },
  });
});

// Update cache settings
exports.updateCacheSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();

  settings.cache = {
    ...settings.cache,
    ...req.body,
  };
  settings.updatedBy = req.user.id;

  await settings.save();
  
  // Clear all cache if cache is disabled
  if (!settings.cache.enabled) {
    await clearCache();
  }

  res.status(200).json({
    status: 'success',
    data: {
      cache: settings.cache,
    },
  });
});

// Get content settings
exports.getContentSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne().select('content');

  res.status(200).json({
    status: 'success',
    data: {
      content: settings?.content || {},
    },
  });
});

// Update content settings
exports.updateContentSettings = catchAsync(async (req, res) => {
  const settings = await Settings.findOne();

  settings.content = {
    ...settings.content,
    ...req.body,
  };
  settings.updatedBy = req.user.id;

  await settings.save();
  await clearCache('settings:content');

  res.status(200).json({
    status: 'success',
    data: {
      content: settings.content,
    },
  });
});
