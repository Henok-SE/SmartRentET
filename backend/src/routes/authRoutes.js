const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// ============================================
// PUBLIC ROUTES - No authentication needed
// ============================================
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/change-password', authController.changePassword);

// ============================================
// NATIONAL ID VERIFICATION ROUTES
// ============================================
router.post('/send-national-id-verification', authController.sendNationalIdVerification);
router.post('/verify-national-id', authController.verifyNationalId);

// ============================================
// PROTECTED ROUTES - Authentication needed
// ============================================
router.get('/me', authenticateToken, authController.getMe);
router.post('/update-username', authenticateToken, authController.updateUsername);

// ============================================
// ADMIN ROUTES - Authentication + Role required
// ============================================
router.post(
  '/office-admin', 
  authenticateToken, 
  authorizeRoles('SUPER_ADMIN'), 
  authController.createOfficeAdmin
);

router.post(
  '/officer', 
  authenticateToken, 
  authorizeRoles('SUPER_ADMIN', 'OFFICE_ADMIN'), 
  authController.createOfficer
);

module.exports = router;