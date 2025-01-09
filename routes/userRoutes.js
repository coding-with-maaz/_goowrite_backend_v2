const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Admin only routes
router.use(authController.restrictTo('admin'));

router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.get('/stats', userController.getUserStats);
router.get('/search', userController.searchUsers);

router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

router.get('/:id/activities', userController.getUserActivities);
router.patch('/:id/toggle-status', userController.toggleUserStatus);
router.patch('/:id/role', userController.updateUserRole);

module.exports = router;
