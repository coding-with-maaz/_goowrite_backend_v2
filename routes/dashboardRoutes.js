const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authController = require('../controllers/authController');
const router = express.Router();

// Protect all dashboard routes
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Overview and statistics
router.get('/overview', dashboardController.getOverviewStats);
router.get('/activity-logs', dashboardController.getActivityLogs);
router.get('/popular-biographies', dashboardController.getPopularBiographies);
router.get('/user-stats', dashboardController.getUserStats);

module.exports = router;
