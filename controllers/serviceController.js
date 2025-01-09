const Service = require('../models/Service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { filterObj, createSlug } = require('../utils/apiUtils');
const { uploadImage, deleteImage } = require('../utils/imageUtils');

// Get all services
exports.getAllServices = catchAsync(async (req, res, next) => {
  // Build query
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(field => delete queryObj[field]);

  // Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

  let query = Service.find(JSON.parse(queryStr));

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  // Execute query
  const [services, total] = await Promise.all([
    query,
    Service.countDocuments(JSON.parse(queryStr)),
  ]);

  res.status(200).json({
    status: 'success',
    results: services.length,
    total,
    data: {
      services,
    },
  });
});

// Get service by ID or slug
exports.getService = catchAsync(async (req, res, next) => {
  const query = req.params.id.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: req.params.id }
    : { slug: req.params.id };

  const service = await Service.findOne(query).populate('reviews');

  if (!service) {
    return next(new AppError('No service found with that ID or slug', 404));
  }

  // Increment views
  await service.incrementViews();

  res.status(200).json({
    status: 'success',
    data: {
      service,
    },
  });
});

// Create service
exports.createService = catchAsync(async (req, res, next) => {
  // Handle image upload
  if (req.files) {
    const imageResult = await uploadImage(req.files.image, 'services');
    const iconResult = await uploadImage(req.files.icon, 'services/icons');
    req.body.image = imageResult.url;
    req.body.icon = iconResult.url;
  }

  const service = await Service.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      service,
    },
  });
});

// Update service
exports.updateService = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  // Handle image updates
  if (req.files) {
    if (req.files.image) {
      await deleteImage(service.image);
      const imageResult = await uploadImage(req.files.image, 'services');
      req.body.image = imageResult.url;
    }
    if (req.files.icon) {
      await deleteImage(service.icon);
      const iconResult = await uploadImage(req.files.icon, 'services/icons');
      req.body.icon = iconResult.url;
    }
  }

  // Update service
  const updatedService = await Service.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      service: updatedService,
    },
  });
});

// Delete service
exports.deleteService = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  // Delete associated images
  await Promise.all([
    deleteImage(service.image),
    deleteImage(service.icon),
  ]);

  await service.remove();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get service statistics
exports.getServiceStats = catchAsync(async (req, res, next) => {
  const stats = await Service.getServiceStats();

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

// Update service order
exports.updateServiceOrder = catchAsync(async (req, res, next) => {
  const { services } = req.body;

  if (!Array.isArray(services)) {
    return next(new AppError('Invalid input format', 400));
  }

  // Update order of multiple services
  await Promise.all(
    services.map((service, index) =>
      Service.findByIdAndUpdate(service.id, { order: index })
    )
  );

  res.status(200).json({
    status: 'success',
    message: 'Service order updated successfully',
  });
});

// Increment service inquiries
exports.incrementInquiries = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  await service.incrementInquiries();

  res.status(200).json({
    status: 'success',
    message: 'Service inquiries incremented successfully',
  });
});

// Increment service conversions
exports.incrementConversions = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  await service.incrementConversions();

  res.status(200).json({
    status: 'success',
    message: 'Service conversions incremented successfully',
  });
});
