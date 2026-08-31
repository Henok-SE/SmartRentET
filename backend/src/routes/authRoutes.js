const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  loginSchema,
  verifyOTPSchema,
  changePasswordSchema,
  createOfficeAdminSchema,
  createOfficerSchema,
  updateUserStatusSchema
} = require('../validations/schemas');

// ============================================
// PUBLIC ROUTES - No authentication
// ============================================

router.post('/login', validate(loginSchema), authController.login);
router.post('/verify-otp', validate(verifyOTPSchema), authController.verifyOTP);
router.post('/change-password', validate(changePasswordSchema), authController.changePassword);
router.post('/register', authController.register);
router.post('/send-national-id-verification', authController.sendNationalIdVerification);
router.post('/verify-national-id', authController.verifyNationalId);

// ============================================
// PROTECTED ROUTES - Authentication required
// ============================================

router.get('/me', authenticateToken, authController.getMe);
router.post('/update-username', authenticateToken, authController.updateUsername);

// ============================================
// SUPER ADMIN ONLY
// ============================================

router.post(
  '/office-admin',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN'),
  validate(createOfficeAdminSchema),
  authController.createOfficeAdmin
);

// ============================================
// SUPER ADMIN OR OFFICE ADMIN
// ============================================

router.post(
  '/officer',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN', 'OFFICE_ADMIN'),
  validate(createOfficerSchema),
  authController.createOfficer
);

router.patch(
  '/users/:id/status',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN', 'OFFICE_ADMIN'),
  validate(updateUserStatusSchema),
  authController.setAccountStatus
);

module.exports = router;