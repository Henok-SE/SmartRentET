const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreementController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  createAgreementSchema,
  verifyCodeSchema,
  paymentSchema,
  verifyNationalIdSchema,
  verifyOTPSchema
} = require('../validations/schemas');

// ============================================
// ALL ROUTES - Authentication required
// ============================================
router.use(authenticateToken);

// ============================================
// NATIONAL ID VERIFICATION - Officers and Office Admins
// ============================================

// Step 1: Verify Landlord National ID
router.post(
  '/verify-landlord',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(verifyNationalIdSchema),
  agreementController.verifyLandlordNationalId
);

// Step 2: Verify Landlord OTP
router.post(
  '/verify-landlord-otp',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(verifyOTPSchema),
  agreementController.verifyLandlordOTP
);

// Step 3: Verify Tenant National ID
router.post(
  '/verify-tenant',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(verifyNationalIdSchema),
  agreementController.verifyTenantNationalId
);

// Step 4: Verify Tenant OTP
router.post(
  '/verify-tenant-otp',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(verifyOTPSchema),
  agreementController.verifyTenantOTP
);

// ============================================
// AGREEMENT OPERATIONS - Officers and Office Admins
// ============================================

// Step 5: Create Agreement
router.post(
  '/',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(createAgreementSchema),
  agreementController.createAgreement
);

// Verify USSD consent code
router.post(
  '/:id/verify',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(verifyCodeSchema),
  agreementController.verifyCode
);

// Process service fee payment
router.post(
  '/:id/pay-service-fee',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(paymentSchema),
  agreementController.processServiceFeePayment
);

// Get agreement by ID
router.get('/:id', agreementController.getAgreement);

module.exports = router;