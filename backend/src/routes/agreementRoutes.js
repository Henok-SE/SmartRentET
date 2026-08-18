const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreementController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Create agreement (Officer or Office Admin only)
router.post('/', authorizeRoles('OFFICER', 'OFFICE_ADMIN'), agreementController.createAgreement);

// Verify USSD code (Officer or Office Admin only)
router.post('/:id/verify', authorizeRoles('OFFICER', 'OFFICE_ADMIN'), agreementController.verifyCode);

// Process service fee payment (Officer or Office Admin only)
router.post('/:id/pay-service-fee', authorizeRoles('OFFICER', 'OFFICE_ADMIN'), agreementController.processServiceFeePayment);

// Get agreement by ID (Authenticated users)
router.get('/:id', agreementController.getAgreement);

module.exports = router;