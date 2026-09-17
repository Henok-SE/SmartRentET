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
    verifyPayment,
    getPaymentRecords,
    updatePaymentStatus,
    handleProviderWebhook,
    handleMockPaymentCallback,
    handleStarPayWebhook
} = require('../controllers/paymentController');

const {
    createPaymentSchema,
    updatePaymentStatusSchema,
    getPaymentRecordsSchema
} = require('../validations/paymentValidation');

// Public payment settlement endpoints
router.get('/inquiry/:referenceNumber', getPaymentInquiry);
router.post('/', validate(createPaymentSchema), createPayment);
router.get('/:paymentId', getPaymentById);
router.post('/:paymentId/verify', verifyPayment);

// Webhook and simulation endpoints
router.post('/provider-webhook', handleProviderWebhook);
router.post('/starpay/webhook', handleStarPayWebhook);
router.post('/mock-callback', handleMockPaymentCallback);

// Authenticated ledger and management endpoints (strictly scoped to assigned government office)
router.get(
    '/',
    authenticateToken,
    authorizeRoles('OFFICER', 'OFFICE_ADMIN'),
    validate(getPaymentRecordsSchema, 'query'),
    getPaymentRecords
);
router.get('/agreement/:agreementId', authenticateToken, getPaymentHistory);
router.patch(
    '/:paymentId/status',
    authenticateToken,
    authorizeRoles('SUPER_ADMIN', 'OFFICE_ADMIN', 'OFFICER'),
    validate(updatePaymentStatusSchema),
    updatePaymentStatus
);

module.exports = router;