const express = require('express');
const contactController = require('../controllers/contactController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/', contactController.createContact);

// Protected routes (admin only)
router.use(authController.protect, authController.restrictTo('admin'));

router.get('/', contactController.getAllContacts);
router.get('/:id', contactController.getContact);
router.patch('/:id/status', contactController.updateContactStatus);

module.exports = router;
