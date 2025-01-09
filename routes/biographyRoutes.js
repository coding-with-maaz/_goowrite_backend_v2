const express = require('express');
const biographyController = require('../controllers/biographyController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes (no authentication required)
router.get('/', biographyController.getAllBiographies);
router.get('/stats', biographyController.getBiographyStats);
router.get('/featured', biographyController.getFeaturedBiographies);
router.get('/biography-of-the-day', biographyController.getBiographyOfTheDay);
router.get('/:slug', biographyController.getBiography);

// Protected routes (authentication required)
router.use(authMiddleware.protect); // Apply auth middleware only to routes below

// Admin only routes
router.post('/', 
  authMiddleware.restrictTo('admin'),
  biographyController.createBiography
);

router.patch('/:slug', 
  authMiddleware.restrictTo('admin'),
  biographyController.updateBiography
);

router.delete('/:slug', 
  authMiddleware.restrictTo('admin'),
  biographyController.deleteBiography
);

// User interaction routes (requires authentication)
router.patch('/:slug/like', biographyController.likeBiography);
router.patch('/:slug/bookmark', biographyController.bookmarkBiography);
router.post('/:slug/comment', biographyController.addComment);

module.exports = router;
