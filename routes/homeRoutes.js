const express = require('express');
const homeController = require('../controllers/homeController');
const { cacheMiddleware } = require('../middlewares/cache');

const router = express.Router();

// Cache durations in seconds
const CACHE_DURATIONS = {
  FEATURED_BIOS: 300, // 5 minutes
  BIO_OF_DAY: 86400, // 24 hours
  TIMELINE: 3600, // 1 hour
  CATEGORIES: 3600, // 1 hour
};

// Featured biographies
router.get(
  '/featured-biographies',
  cacheMiddleware(CACHE_DURATIONS.FEATURED_BIOS),
  homeController.getFeaturedBiographies
);

// Biography of the day
router.get(
  '/biography-of-day',
  cacheMiddleware(CACHE_DURATIONS.BIO_OF_DAY),
  homeController.getBiographyOfDay
);

// Historical timeline
router.get(
  '/timeline',
  cacheMiddleware(CACHE_DURATIONS.TIMELINE),
  homeController.getHistoricalTimeline
);

// Categories
router.get(
  '/categories',
  cacheMiddleware(CACHE_DURATIONS.CATEGORIES),
  homeController.getCategories
);

module.exports = router;
