const express = require('express');
const categoryController = require('../controllers/categoryController');
const authController = require('../controllers/authController');
const router = express.Router();

// Public routes
router.get('/tree', categoryController.getCategoryTree);
router.get('/search', categoryController.searchCategories);
router.get('/featured', categoryController.getFeaturedCategories);
router.get('/stats', categoryController.getCategoryStats);
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategory);

// Protect all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Admin only routes
router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
router.patch('/:id/toggle-featured', categoryController.toggleFeatured);
router.patch('/reorder', categoryController.reorderCategories);

module.exports = router;
