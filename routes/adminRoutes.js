const express = require('express');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Dashboard routes
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/activities', adminController.getRecentActivities);

// User management routes
router.route('/users')
  .get(adminController.getUsers)
  .post(adminController.createUser);

router.get('/users/stats', adminController.getUserStats);

router.route('/users/:id')
  .get(adminController.getUser)
  .patch(adminController.updateUser)
  .delete(adminController.deleteUser);

router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);
router.patch('/users/:id/role', adminController.updateUserRole);
router.post('/users/:id/reset-password', adminController.resetUserPassword);
router.post('/users/invite', adminController.inviteUser);

// Category management routes
router.route('/categories')
  .get(adminController.getCategories)
  .post(adminController.createCategory);

router.route('/categories/:id')
  .patch(adminController.updateCategory)
  .delete(adminController.deleteCategory);

router.route('/settings/general')
  .get(adminController.getGeneralSettings)
  .patch(adminController.updateGeneralSettings);

router.route('/settings/site')
  .get(adminController.getSiteSettings)
  .patch(adminController.updateSiteSettings);

router.route('/settings/email')
  .get(adminController.getEmailSettings)
  .patch(adminController.updateEmailSettings);

router.route('/settings/api-keys')
  .get(adminController.getApiKeys)
  .post(adminController.createApiKey);

router.route('/settings/api-keys/:id')
  .patch(adminController.updateApiKey)
  .delete(adminController.deleteApiKey);

router.route('/settings/backups')
  .get(adminController.getBackups)
  .post(adminController.createBackup);

router.route('/settings/backups/:id')
  .delete(adminController.deleteBackup);

router.post('/settings/backups/:id/restore', adminController.restoreBackup);

// Add this route with your other API key routes
router.post('/settings/api-keys/:id/revoke', adminController.revokeApiKey);

// Add this route with your other email settings routes
router.post('/settings/email/test', adminController.testEmailSettings);

// Add these routes to your existing admin routes
router.route('/settings/backup')
  .get(adminController.getBackupSettings)
  .patch(adminController.updateBackupSettings);

module.exports = router;
