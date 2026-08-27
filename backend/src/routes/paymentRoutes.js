const express = require('express');

const {
    getPaymentInquiry,
    createPayment,
    getPaymentHistory,
    getPaymentById,
    updatePaymentStatus
} = require('../controllers/paymentController');

const router = express.Router();

// Payment inquiry
router.get('/inquiry/:referenceNumber', getPaymentInquiry);

// Create payment
router.post('/', createPayment);

// Get payment history
router.get('/agreement/:agreementId', getPaymentHistory);

// Get single payment
router.get('/:paymentId', getPaymentById);

// Update payment status
router.patch('/:paymentId/status', updatePaymentStatus);

module.exports = router;