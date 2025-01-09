const express = require('express');
const pricingController = require('../controllers/pricingController');
const authController = require('../controllers/authController');
const { cacheMiddleware } = require('../middlewares/cache');

const router = express.Router({ mergeParams: true });

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  PLANS: 300, // 5 minutes
  STATS: 600, // 10 minutes
};

// Public routes
router.get(
  '/',
  cacheMiddleware(CACHE_DURATIONS.PLANS),
  pricingController.getAllPlans
);

router.get(
  '/service/:serviceId',
  cacheMiddleware(CACHE_DURATIONS.PLANS),
  pricingController.getServicePlans
);

// Protected routes
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.post('/', pricingController.createPlan);

router
  .route('/:id')
  .get(pricingController.getPlan)
  .patch(pricingController.updatePlan)
  .delete(pricingController.deletePlan);

router.patch('/order', pricingController.updatePlanOrder);

router.get(
  '/stats',
  cacheMiddleware(CACHE_DURATIONS.STATS),
  pricingController.getPlanStats
);

router.patch(
  '/bulk-update',
  pricingController.bulkUpdatePrices
);

module.exports = router;
