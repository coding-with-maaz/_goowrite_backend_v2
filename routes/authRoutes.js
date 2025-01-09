const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// Admin routes
router.use('/admin', express.Router()
  .post('/login', authController.adminLogin)
  .get('/me', authController.protect, authController.restrictTo('admin'), authController.getMe)
  .get('/logout', authController.protect, authController.restrictTo('admin'), authController.logout)
  .patch('/update-password', authController.protect, authController.restrictTo('admin'), authController.updatePassword)
  .post('/forgot-password', authController.forgotPassword)
  .patch('/reset-password/:token', authController.resetPassword)
);

// Protected routes
router.use(authController.protect);
router.get('/logout', authController.logout);
router.get('/me', authController.getMe);
router.patch('/update-password', authController.updatePassword);

module.exports = router;
