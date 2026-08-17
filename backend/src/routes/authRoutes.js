const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);

router.get('/me', authenticateToken, authController.getMe);

router.post('/system-admin', authenticateToken, authorizeRoles('SUPER_ADMIN'), authController.createSystemAdmin);
router.post('/officer', authenticateToken, authorizeRoles('SYSTEM_ADMIN', 'SUPER_ADMIN'), authController.createOfficer);

module.exports = router;