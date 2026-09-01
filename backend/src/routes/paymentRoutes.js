const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const { validate } = require('../middleware/validate');

const {
    createPayment,
    getPaymentInquiry,
    getPaymentHistory,
    getPaymentById,
    updatePaymentStatus,
    handleProviderWebhook,
    handleMockPaymentCallback
} = require('../controllers/paymentController');


const {
    createPaymentSchema,
    updatePaymentStatusSchema
} = require('../validations/paymentValidation');

// =========================================================================
// 1. PUBLIC PAYMENT SETTLEMENT ROUTES (Accessible by Tenants / Mini-App)
// =========================================================================

// Inquire rental agreement payment due (by reference code)
router.get(
    '/inquiry/:referenceNumber',
    getPaymentInquiry
);

// Initiate payment via provider abstraction (Telebirr / CBE)
router.post(
    '/',
    validate(createPaymentSchema),
    createPayment
);

// Get single payment status (Used by Mini-App for real-time polling)
router.get(
    '/:paymentId',
    getPaymentById
);

// =========================================================================
// 2. AUTHORITATIVE WEBHOOK & SIMULATION ROUTES
// =========================================================================

// Authoritative Webhook Endpoint (Enforces HMAC-SHA256 signature verification)
router.post(
    '/provider-webhook',
    handleProviderWebhook
);

// Legacy Mock Callback Endpoint (Restricted to Development / Testing only)
router.post(
    '/mock-callback',
    handleMockPaymentCallback
);

// =========================================================================
// 3. AUTHENTICATED & RESTRICTED ROUTES (Officers, Admins, Tenancy Audits)
// =========================================================================

// Payment ledger history for a lease agreement (Authenticated users)
router.get(
    '/agreement/:agreementId',
    authenticateToken,
    getPaymentHistory
);

// Administrative manual status adjustment (Super Admin, Office Admin, Officer)
router.patch(
    '/:paymentId/status',
    authenticateToken,
    authorizeRoles('SUPER_ADMIN', 'OFFICE_ADMIN', 'OFFICER'),
    validate(updatePaymentStatusSchema),
    updatePaymentStatus
);

module.exports = router;