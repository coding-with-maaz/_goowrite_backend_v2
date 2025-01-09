const express = require('express');
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all profile routes
router.use(protect);

router.route('/')
  .get(profileController.getProfile)
  .patch(profileController.updateProfile);

module.exports = router; 