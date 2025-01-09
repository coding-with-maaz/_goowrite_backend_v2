const { Subscriber, Campaign } = require('../models/Newsletter');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const { filterObj } = require('../utils/apiUtils');
const { sendNewsletter } = require('../utils/newsletterUtils');

// Subscribe to newsletter
exports.subscribe = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    'email',
    'name',
    'preferences'
  );

  // Add metadata
  filteredBody.metadata = {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    source: req.body.source || 'website',
  };

  // Check if already subscribed
  const existingSubscriber = await Subscriber.findOne({ email: filteredBody.email });
  if (existingSubscriber && existingSubscriber.status === 'subscribed') {
    return next(new AppError('Email already subscribed', 400));
  }

  // Create or update subscriber
  const subscriber = existingSubscriber
    ? await Subscriber.findOneAndUpdate(
        { email: filteredBody.email },
        filteredBody,
        { new: true, runValidators: true }
      )
    : await Subscriber.create(filteredBody);

  // Generate verification token
  const verificationToken = subscriber.createVerificationToken();
  await subscriber.save();

  // Send verification email
  try {
    await new Email(subscriber).sendNewsletterVerification(verificationToken);

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent',
    });
  } catch (error) {
    subscriber.verificationToken = undefined;
    subscriber.verificationExpires = undefined;
    await subscriber.save();

    return next(new AppError('Error sending verification email. Please try again.', 500));
  }
});

// Verify subscription
exports.verifySubscription = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const subscriber = await Subscriber.findOne({
    verificationToken: hashedToken,
    verificationExpires: { $gt: Date.now() },
  });

  if (!subscriber) {
    return next(new AppError('Invalid or expired verification token', 400));
  }

  subscriber.status = 'subscribed';
  subscriber.verificationToken = undefined;
  subscriber.verificationExpires = undefined;
  await subscriber.save();

  // Send welcome email
  await new Email(subscriber).sendNewsletterWelcome();

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully',
  });
});

// Unsubscribe from newsletter
exports.unsubscribe = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const subscriber = await Subscriber.findOneAndUpdate(
    { unsubscribeToken: hashedToken },
    { status: 'unsubscribed' },
    { new: true }
  );

  if (!subscriber) {
    return next(new AppError('Invalid unsubscribe token', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Successfully unsubscribed',
  });
});

// Update preferences (requires authentication)
exports.updatePreferences = catchAsync(async (req, res, next) => {
  const subscriber = await Subscriber.findOne({ email: req.user.email });

  if (!subscriber) {
    return next(new AppError('No subscription found', 404));
  }

  const filteredBody = filterObj(req.body, 'preferences');
  
  const updatedSubscriber = await Subscriber.findByIdAndUpdate(
    subscriber._id,
    filteredBody,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      subscriber: updatedSubscriber,
    },
  });
});

// Create campaign (admin only)
exports.createCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      campaign,
    },
  });
});

// Get all campaigns (admin only)
exports.getAllCampaigns = catchAsync(async (req, res, next) => {
  const campaigns = await Campaign.find()
    .sort('-createdAt')
    .populate('createdBy', 'name email');

  res.status(200).json({
    status: 'success',
    results: campaigns.length,
    data: {
      campaigns,
    },
  });
});

// Get campaign by ID (admin only)
exports.getCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!campaign) {
    return next(new AppError('No campaign found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      campaign,
    },
  });
});

// Update campaign (admin only)
exports.updateCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!campaign) {
    return next(new AppError('No campaign found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      campaign,
    },
  });
});

// Delete campaign (admin only)
exports.deleteCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findByIdAndDelete(req.params.id);

  if (!campaign) {
    return next(new AppError('No campaign found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Send campaign (admin only)
exports.sendCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return next(new AppError('No campaign found with that ID', 404));
  }

  if (campaign.status === 'sent') {
    return next(new AppError('Campaign has already been sent', 400));
  }

  // Update campaign status
  campaign.status = 'sending';
  await campaign.save();

  // Send newsletter in background
  sendNewsletter(campaign);

  res.status(200).json({
    status: 'success',
    message: 'Campaign sending started',
  });
});

// Get campaign statistics (admin only)
exports.getCampaignStats = catchAsync(async (req, res, next) => {
  const stats = await Campaign.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRecipients: { $sum: '$stats.totalRecipients' },
        totalDelivered: { $sum: '$stats.delivered' },
        totalOpened: { $sum: '$stats.opened' },
        totalClicked: { $sum: '$stats.clicked' },
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

// Get subscriber statistics (admin only)
exports.getSubscriberStats = catchAsync(async (req, res, next) => {
  const stats = await Subscriber.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
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
