const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreementController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const {
  createAgreementSchema,
  verifyCodeSchema,
  paymentSchema
} = require('../validations/schemas');

// ============================================
// ALL ROUTES - Authentication required
// ============================================
router.use(authenticateToken);

// ============================================
// AGREEMENT OPERATIONS - Officers and Office Admins
// ============================================

// Create Agreement
router.post(
  '/',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(createAgreementSchema),
  agreementController.createAgreement
);

// Verify USSD consent code (agreementId in body)
router.post(
  '/verify',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(verifyCodeSchema),
  agreementController.verifyCode
);

// Process service fee payment (agreementId in body)
router.post(
  '/pay-service-fee',
  authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
  validate(paymentSchema),
  agreementController.processServiceFeePayment
);

// Get agreement by ID (agreementId in URL param)
router.get('/:id', agreementController.getAgreement);

module.exports = router;