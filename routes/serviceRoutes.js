const express = require('express');
const serviceController = require('../controllers/serviceController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');
const { uploadImages } = require('../middlewares/upload');
const { cacheMiddleware } = require('../middlewares/cache');

const router = express.Router();

// Nested routes
router.use('/:serviceId/reviews', reviewRouter);

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  LIST: 300, // 5 minutes
  DETAIL: 300,
  STATS: 600, // 10 minutes
};

// Public routes
router
  .route('/')
  .get(
    cacheMiddleware(CACHE_DURATIONS.LIST),
    serviceController.getAllServices
  );

router
  .route('/:id')
  .get(
    cacheMiddleware(CACHE_DURATIONS.DETAIL),
    serviceController.getService
  );

// Protected routes
router.use(authController.protect);

router
  .route('/:id/inquiries')
  .post(serviceController.incrementInquiries);

router
  .route('/:id/conversions')
  .post(serviceController.incrementConversions);

// Admin only routes
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .post(
    uploadImages({
      fields: [
        { name: 'image', maxCount: 1 },
        { name: 'icon', maxCount: 1 },
      ],
    }),
    serviceController.createService
  );

router
  .route('/:id')
  .patch(
    uploadImages({
      fields: [
        { name: 'image', maxCount: 1 },
        { name: 'icon', maxCount: 1 },
      ],
    }),
    serviceController.updateService
  )
  .delete(serviceController.deleteService);

router
  .route('/stats')
  .get(
    cacheMiddleware(CACHE_DURATIONS.STATS),
    serviceController.getServiceStats
  );

router
  .route('/order')
  .patch(serviceController.updateServiceOrder);

module.exports = router;
