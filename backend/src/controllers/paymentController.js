const paymentService = require('../services/paymentServices');
const ApiResponse = require('../utils/apiResponse');
const { verifyWebhookSignature } = require('../utils/signatureValidator');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * 1. Get Payment Inquiry (Public for reference code lookup)
 */
const getPaymentInquiry = async (req, res, next) => {
    try {
        const { referenceNumber } = req.params;
        const inquiry = await paymentService.getPaymentInquiry(referenceNumber);

        return ApiResponse.success(res, {
            data: inquiry,
            message: 'Rental agreement payment inquiry retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 2. Initiate Payment (Public with validation)
 */
const createPayment = async (req, res, next) => {
    try {
        const payment = await paymentService.createPayment(req.body);

        return ApiResponse.success(res, {
            data: payment,
            message: 'Payment initiated successfully. Status is PENDING verification.',
            statusCode: 201
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 3. Get Payment History by Agreement ID (Authenticated)
 */
const getPaymentHistory = async (req, res, next) => {
    try {
        const { agreementId } = req.params;
        const payments = await paymentService.getPaymentHistory(agreementId);

        return ApiResponse.success(res, {
            data: payments,
            message: 'Payment history retrieved successfully',
            meta: { count: payments.length }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 4. Get Single Payment Status (Used by Mini-App polling)
 */
const getPaymentById = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const payment = await paymentService.getPaymentById(paymentId);

        return ApiResponse.success(res, {
            data: payment,
            message: 'Payment status retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 5. Update Payment Status (Admin / Municipal Officer Only)
 */
const updatePaymentStatus = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const { status, transactionReference } = req.body;

        const payment = await paymentService.updatePaymentStatus({
            paymentId,
            status,
            transactionReference
        });

        return ApiResponse.success(res, {
            data: payment,
            message: 'Payment status updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 6. Provider Webhook Endpoint (Telebirr / CBE / Simulator)
 * Authoritative payment status transition mechanism
 * Enforces mandatory HMAC-SHA256 signature verification
 */
const handleProviderWebhook = async (req, res, next) => {
    try {
        const signatureHeader = req.headers['x-provider-signature'];
        const secret = process.env.PROVIDER_WEBHOOK_SECRET;
        
        // Strict Webhook Signature Verification
        if (secret) {
            if (!signatureHeader) {
                throw new UnauthorizedError('Missing required X-Provider-Signature header');
            }

            const isValid = verifyWebhookSignature(req.body, signatureHeader, secret);
            if (!isValid) {
                throw new UnauthorizedError('Invalid or forged webhook signature (X-Provider-Signature mismatch)');
            }
        }

        const result = await paymentService.handleProviderWebhook(req.body);

        return ApiResponse.success(res, {
            data: result.payment,
            isDuplicate: result.isDuplicate,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 7. Legacy Mock Callback (Disabled in production)
 */
const handleMockPaymentCallback = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenError('Mock payment callbacks are disabled in production environment');
        }

        const payment = await paymentService.handleMockPaymentCallback(req.body);

        return ApiResponse.success(res, {
            data: payment,
            message: 'Mock payment callback processed successfully'
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
    handleProviderWebhook,
    handleMockPaymentCallback
};