const paymentService = require('../services/paymentServices');

// Get payment inquiry
const getPaymentInquiry = async (req, res, next) => {
    try {
        const { referenceNumber } = req.params;

        const inquiry =
            await paymentService.getPaymentInquiry(referenceNumber);

        return res.status(200).json({
            success: true,
            data: inquiry
        });
    } catch (error) {
        next(error);
    }
};

// Create payment
const createPayment = async (req, res, next) => {
    try {
        const payment =
            await paymentService.createPayment(req.body);

        return res.status(201).json({
            success: true,
            message: 'Payment initiated successfully',
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

// Get payment history
const getPaymentHistory = async (req, res, next) => {
    try {
        const { agreementId } = req.params;

        const payments =
            await paymentService.getPaymentHistory(agreementId);

        return res.status(200).json({
            success: true,
            count: payments.length,
            data: payments
        });
    } catch (error) {
        next(error);
    }
};

// Get single payment
const getPaymentById = async (req, res, next) => {
    try {
        const { paymentId } = req.params;

        const payment =
            await paymentService.getPaymentById(paymentId);

        return res.status(200).json({
            success: true,
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

// Update payment status
const updatePaymentStatus = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const { status, transactionReference } = req.body;

        const payment =
            await paymentService.updatePaymentStatus({
                paymentId,
                status,
                transactionReference
            });

        return res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

// Handle mock provider callback
const handleMockPaymentCallback = async (req, res, next) => {
    try {
        const payment =
            await paymentService.handleMockPaymentCallback(
                req.body
            );

        return res.status(200).json({
            success: true,
            message: 'Payment callback processed successfully',
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPaymentInquiry,
    createPayment,
    getPaymentHistory,
    getPaymentById,
    updatePaymentStatus,
    handleMockPaymentCallback
};