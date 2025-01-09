const express = require('express');
const settingsController = require('../controllers/settingsController');
const authController = require('../controllers/authController');
const router = express.Router();

// Public routes
router.get('/', settingsController.getSettings);
router.get('/theme', settingsController.getThemeSettings);
router.get('/seo', settingsController.getSeoSettings);
router.get('/content', settingsController.getContentSettings);

// Protect and restrict all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Protected admin routes
router.patch('/', settingsController.updateSettings);
router.patch('/theme', settingsController.updateThemeSettings);
router.patch('/seo', settingsController.updateSeoSettings);
router.patch('/email', settingsController.updateEmailSettings);
router.get('/email', settingsController.getEmailSettings);
router.patch('/maintenance', settingsController.toggleMaintenanceMode);
router.patch('/cache', settingsController.updateCacheSettings);
router.patch('/content', settingsController.updateContentSettings);

module.exports = router;
