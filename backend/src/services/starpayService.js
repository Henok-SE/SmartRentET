const axios = require('axios');
const crypto = require('crypto');

const DEFAULT_SANDBOX_KEY = 'rtwFSXZ3nrv2uqAsuH/zqcnn9WiilF4keCDhXLfMuBYoWmh7Lt/m7JQEv3b/9A92';
const DEFAULT_WEBHOOK_SECRET = '520954f5b9300abb5cbdd3bb41d50e1e223b59cccf76a8744eea4291820d70ea';

const getApiKey = () => process.env.STARPAY_API_KEY || process.env.STARPAY_API_SECRET || DEFAULT_SANDBOX_KEY;
const getApiUrl = () => process.env.STARPAY_API_URL || 'https://sandbox-api.starpayethiopia.com/v1/starpay-api';
const getCallbackUrl = () => process.env.STARPAY_CALLBACK_URL || 'http://localhost:5000/api/payments/starpay/webhook';
const getReturnUrl = () => process.env.STARPAY_RETURN_URL || 'http://localhost:3000/payments/success';
const getWebhookSecret = () => process.env.STARPAY_WEBHOOK_SECRET || DEFAULT_WEBHOOK_SECRET;

const starpayClient = axios.create({
    timeout: 15000,
});

starpayClient.interceptors.request.use((config) => {
    config.baseURL = getApiUrl();
    config.headers['Content-Type'] = 'application/json';
    config.headers['x-api-secret'] = getApiKey();
    return config;
});

/**
 * Initiate StarPay Rent Payment Transaction
 */
const initiatePayment = async ({
    paymentId,
    amount,
    customerName,
    customerPhoneNumber,
    referenceNumber,
    callbackUrl,
    redirectUrl,
    description,
}) => {
    try {
        const payload = {
            amount: Number(amount),
            description: description || `SmartRent Rent Settlement - ${referenceNumber || paymentId}`,
            currency: 'ETB',
            customerName: customerName || 'SmartRent Tenant',
            customerPhoneNumber: customerPhoneNumber || '+251900000000',
            callbackURL: callbackUrl || STARPAY_CALLBACK_URL,
            redirectUrl: redirectUrl || STARPAY_RETURN_URL,
            metadata: {
                paymentId,
                referenceNumber: referenceNumber || null,
            },
            items: [
                {
                    productId: `RENT-${referenceNumber || paymentId}`,
                    item_name: description || `Rent Settlement ${referenceNumber || ''}`.trim(),
                    quantity: 1,
                    unit_price: Number(amount),
                },
            ],
        };

        console.log(`[StarPay Service] Creating order for paymentId=${paymentId}, amount=${amount} ETB`);
        const response = await starpayClient.post('/trdp/order', payload);

        if (!response.data || response.data.status !== 'success') {
            throw new Error(response.data?.message || 'StarPay rejected order creation');
        }

        const orderData = response.data.data;
        console.log(`[StarPay Service] Order created: orderId=${orderData.order_id}, paymentUrl=${orderData.payment_url}`);

        return {
            success: true,
            provider: 'STARPAY',
            status: 'PENDING',
            transactionReference: orderData.order_id,
            checkoutUrl: orderData.payment_url,
            redirectUrl: orderData.redirectUrl,
            expiresAt: orderData.expires_at,
            message: 'StarPay payment order created successfully',
            raw: orderData,
        };
    } catch (error) {
        const detail = error.response?.data?.message || error.response?.data?.error?.message || error.message;
        console.error('[StarPay Service] Initiation error:', detail);
        throw new Error(`StarPay Gateway Error: ${detail}`);
    }
};

/**
 * Verify incoming webhook signature from StarPay
 */
const verifyWebhookSignature = (payload, signatureHeader, secret = getWebhookSecret()) => {
    if (!signatureHeader || !secret) {
        return true;
    }

    try {
        const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(content);
        const digest = hmac.digest('hex');

        // Check raw hex or sha256= prefix
        const cleanHeader = signatureHeader.replace(/^sha256=/, '').trim();
        return crypto.timingSafeEqual(Buffer.from(cleanHeader), Buffer.from(digest));
    } catch {
        return false;
    }
};

module.exports = {
    initiatePayment,
    createTransaction: initiatePayment,
    verifyWebhookSignature,
};