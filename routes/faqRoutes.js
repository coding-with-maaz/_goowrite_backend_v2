const express = require('express');
const faqController = require('../controllers/faqController');
const authController = require('../controllers/authController');
const { cacheMiddleware } = require('../middlewares/cache');

const router = express.Router();

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  FAQS: 300, // 5 minutes
};

// Public routes
router.get(
  '/',
  cacheMiddleware(CACHE_DURATIONS.FAQS),
  faqController.getAllFAQs
);

router.get(
  '/category/:category',
  cacheMiddleware(CACHE_DURATIONS.FAQS),
  faqController.getFAQsByCategory
);

// Protected routes
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.post('/', faqController.createFAQ);

router
  .route('/:id')
  .get(faqController.getFAQ)
  .patch(faqController.updateFAQ)
  .delete(faqController.deleteFAQ);

router.patch('/order', faqController.updateFAQOrder);

module.exports = router;
