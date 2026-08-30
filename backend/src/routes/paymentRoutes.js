const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
    createPayment,
    getPaymentInquiry,
    getPaymentHistory,
    getPaymentById,
    updatePaymentStatus,
    handleMockPaymentCallback
} = require('../controllers/paymentController');

const validate = require('../middleware/validate');

const {
    createPaymentSchema,
    updatePaymentStatusSchema
} = require('../validations/paymentValidation');

const router = express.Router();

router.post(
    '/',
    validate(createPaymentSchema),
    createPayment
);

router.get(
    '/inquiry/:referenceNumber',
    getPaymentInquiry
);

router.get(
    '/agreement/:agreementId',
    getPaymentHistory
);

router.post(
    '/mock-callback',
    handleMockPaymentCallback
);

router.get(
    '/:paymentId',
    getPaymentById
);

router.patch(
    '/:paymentId/status',
    validate(updatePaymentStatusSchema),
    updatePaymentStatus
);

module.exports = router;