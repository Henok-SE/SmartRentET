const express = require('express');

const {
    createPayment,
    getPaymentHistory,
    getPaymentById,
    updatePaymentStatus
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
    '/agreement/:agreementId',
    getPaymentHistory
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