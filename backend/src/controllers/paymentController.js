const paymentService = require('../services/paymentServices');
const starpayService = require('../services/starpayService');
const ApiResponse = require('../utils/apiResponse');
const { verifyWebhookSignature } = require('../utils/signatureValidator');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

// Retrieve payment inquiry for an agreement reference number
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

// Initiate a payment transaction
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

// Retrieve payment ledger history for an agreement
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

// Get single payment status by ID
const getPaymentById = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const payment = await paymentService.getPaymentById(paymentId);

        // Prevent intermediate browser/proxy 304 caching of live payment status
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        return ApiResponse.success(res, {
            data: payment,
            message: 'Payment status retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Verify and settle payment
const verifyPayment = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const payment = await paymentService.verifyPayment(paymentId);

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        return ApiResponse.success(res, {
            data: payment,
            message: 'Payment verified and settled successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Manually update payment status
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

// Handle provider webhook callback with signature verification
const handleProviderWebhook = async (req, res, next) => {
    try {
        const signatureHeader = req.headers['x-provider-signature'];
        const secret = process.env.PROVIDER_WEBHOOK_SECRET;
        
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

// Process mock payment callback (development and test environments only)
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

// Retrieve payment records scoped to the authenticated officer's or office admin's government office
const getPaymentRecords = async (req, res, next) => {
    try {
        const result = await paymentService.getOfficerPaymentRecords({
            userId: req.user.userId,
            role: req.user.role,
            query: req.query
        });

        return ApiResponse.success(res, {
            data: result.records,
            meta: result.meta,
            message: 'Payment records retrieved successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Handle StarPay webhook callback
const handleStarPayWebhook = async (req, res, next) => {
    try {
        console.log('[StarPay Webhook] Received callback headers:', req.headers);
        console.log('[StarPay Webhook] Received callback payload:', req.body);

        const signatureHeader = req.headers['x-starpay-signature'] || 
                                req.headers['x-signature'] || 
                                req.headers['x-provider-signature'];
        const secret = process.env.STARPAY_WEBHOOK_SECRET;

        if (secret && signatureHeader) {
            const isValid = starpayService.verifyWebhookSignature(req.body, signatureHeader, secret);
            if (!isValid) {
                throw new UnauthorizedError('Invalid or forged StarPay webhook signature');
            }
        }

        const payload = req.body || {};
        const transactionReference = payload.order_id || payload.orderId || payload.transactionId || payload.data?.order_id;
        const paymentId = payload.metadata?.paymentId || payload.paymentId || payload.data?.metadata?.paymentId;
        const rawStatus = payload.status || payload.order_status || payload.data?.status || 'SUCCESS';

        const isSuccess = ['PAID', 'SUCCESS', 'COMPLETED', 'APPROVED'].includes(String(rawStatus).toUpperCase());
        const status = isSuccess ? 'SUCCESS' : 'FAILED';

        const result = await paymentService.handleProviderWebhook({
            paymentId,
            transactionReference,
            status,
            notes: `StarPay webhook confirmed status: ${rawStatus}`,
            provider: 'STARPAY'
        });

        return ApiResponse.success(res, {
            data: result.payment,
            isDuplicate: result.isDuplicate,
            message: result.message
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
    verifyPayment,
    getPaymentRecords,
    updatePaymentStatus,
    handleProviderWebhook,
    handleMockPaymentCallback,
    handleStarPayWebhook
};