const FAQ = require('../models/FAQ');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all FAQs
exports.getAllFAQs = catchAsync(async (req, res, next) => {
  const faqs = await FAQ.find({ active: true })
    .sort('category order');

  res.status(200).json({
    status: 'success',
    results: faqs.length,
    data: {
      faqs,
    },
  });
});

// Get FAQs by category
exports.getFAQsByCategory = catchAsync(async (req, res, next) => {
  const faqs = await FAQ.find({
    category: req.params.category,
    active: true,
  }).sort('order');

  res.status(200).json({
    status: 'success',
    results: faqs.length,
    data: {
      faqs,
    },
  });
});

// Get single FAQ
exports.getFAQ = catchAsync(async (req, res, next) => {
  const faq = await FAQ.findById(req.params.id);

  if (!faq) {
    return next(new AppError('No FAQ found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      faq,
    },
  });
});

// Create new FAQ (admin only)
exports.createFAQ = catchAsync(async (req, res, next) => {
  const faq = await FAQ.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      faq,
    },
  });
});

// Update FAQ (admin only)
exports.updateFAQ = catchAsync(async (req, res, next) => {
  const faq = await FAQ.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!faq) {
    return next(new AppError('No FAQ found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      faq,
    },
  });
});

// Delete FAQ (admin only)
exports.deleteFAQ = catchAsync(async (req, res, next) => {
  const faq = await FAQ.findByIdAndDelete(req.params.id);

  if (!faq) {
    return next(new AppError('No FAQ found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Update FAQ order (admin only)
exports.updateFAQOrder = catchAsync(async (req, res, next) => {
  const { orders } = req.body;

  if (!orders || !Array.isArray(orders)) {
    return next(new AppError('Please provide an array of FAQ orders', 400));
  }

  const updatePromises = orders.map(({ id, order }) =>
    FAQ.findByIdAndUpdate(id, { order }, { new: true })
  );

  const updatedFAQs = await Promise.all(updatePromises);

  res.status(200).json({
    status: 'success',
    data: {
      faqs: updatedFAQs,
    },
  });
});
