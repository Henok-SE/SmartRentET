const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public routes - No authentication needed
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);

// Protected routes - Authentication needed
router.get('/me', authController.getMe);

// Admin routes
router.post('/office-admin', authController.createOfficeAdmin);
router.post('/officer', authController.createOfficer);

module.exports = router;