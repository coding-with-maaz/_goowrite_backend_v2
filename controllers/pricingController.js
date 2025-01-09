const Pricing = require('../models/Pricing');
const Service = require('../models/Service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all pricing plans for a service
exports.getServicePlans = catchAsync(async (req, res, next) => {
  const plans = await Pricing.find({
    serviceId: req.params.serviceId,
    active: true,
  }).sort('order');

  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: {
      plans,
    },
  });
});

// Get all pricing plans
exports.getAllPlans = catchAsync(async (req, res, next) => {
  const plans = await Pricing.find({ active: true })
    .sort('order');

  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: {
      plans,
    },
  });
});

// Get single plan
exports.getPlan = catchAsync(async (req, res, next) => {
  const plan = await Pricing.findById(req.params.id);

  if (!plan) {
    return next(new AppError('No plan found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// Create new plan
exports.createPlan = catchAsync(async (req, res, next) => {
  // Check if service exists
  const service = await Service.findById(req.body.serviceId);
  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  const plan = await Pricing.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// Update plan
exports.updatePlan = catchAsync(async (req, res, next) => {
  const plan = await Pricing.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!plan) {
    return next(new AppError('No plan found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// Delete plan
exports.deletePlan = catchAsync(async (req, res, next) => {
  const plan = await Pricing.findByIdAndDelete(req.params.id);

  if (!plan) {
    return next(new AppError('No plan found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Update plan order
exports.updatePlanOrder = catchAsync(async (req, res, next) => {
  const { orders } = req.body;

  if (!orders || !Array.isArray(orders)) {
    return next(new AppError('Please provide an array of plan orders', 400));
  }

  const updatePromises = orders.map(({ id, order }) =>
    Pricing.findByIdAndUpdate(id, { order }, { new: true })
  );

  const updatedPlans = await Promise.all(updatePromises);

  res.status(200).json({
    status: 'success',
    data: {
      plans: updatedPlans,
    },
  });
});

// Get plan statistics
exports.getPlanStats = catchAsync(async (req, res, next) => {
  const stats = await Pricing.aggregate([
    {
      $group: {
        _id: '$billingCycle',
        numPlans: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
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

// Bulk update prices
exports.bulkUpdatePrices = catchAsync(async (req, res, next) => {
  const { updates } = req.body;

  if (!Array.isArray(updates)) {
    return next(new AppError('Invalid input format', 400));
  }

  const results = await Promise.all(
    updates.map(async ({ id, price, currency }) => {
      const plan = await Pricing.findByIdAndUpdate(
        id,
        { price, currency },
        { new: true }
      );
      return plan;
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      plans: results,
    },
  });
});
