const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
    getPaymentInquiry,
    createPayment,
    getPaymentHistory,
    getPaymentById,
    updatePaymentStatus
} = require('../controllers/paymentController');

// ============================================
// ALL ROUTES - Authentication required
// ============================================
router.use(authenticateToken);

// ============================================
// PAYMENT ROUTES
// ============================================

router.get('/inquiry/:referenceNumber', getPaymentInquiry);
router.post('/', createPayment);
router.get('/agreement/:agreementId', getPaymentHistory);
router.get('/:paymentId', getPaymentById);
router.patch('/:paymentId/status', updatePaymentStatus);

module.exports = router;