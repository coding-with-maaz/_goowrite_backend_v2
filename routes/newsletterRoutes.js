const express = require('express');
const newsletterController = require('../controllers/newsletterController');
const authController = require('../controllers/authController');
const { rateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Public routes with rate limiting
router.post(
  '/subscribe',
  rateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 requests per IP
    message: 'Too many subscription attempts. Please try again in an hour.',
  }),
  newsletterController.subscribe
);

router.get(
  '/verify/:token',
  newsletterController.verifySubscription
);

router.get(
  '/unsubscribe/:token',
  newsletterController.unsubscribe
);

// Protected routes
router.use(authController.protect);

router.patch(
  '/preferences',
  newsletterController.updatePreferences
);

// Admin only routes
router.use(authController.restrictTo('admin'));

router
  .route('/campaigns')
  .get(newsletterController.getAllCampaigns)
  .post(newsletterController.createCampaign);

router
  .route('/campaigns/:id')
  .get(newsletterController.getCampaign)
  .patch(newsletterController.updateCampaign)
  .delete(newsletterController.deleteCampaign);

router.post(
  '/campaigns/:id/send',
  newsletterController.sendCampaign
);

router.get(
  '/stats/campaigns',
  newsletterController.getCampaignStats
);

router.get(
  '/stats/subscribers',
  newsletterController.getSubscriberStats
);

module.exports = router;
