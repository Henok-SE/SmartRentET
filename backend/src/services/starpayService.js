const axios = require('axios');
const crypto = require('crypto');

const DEFAULT_SANDBOX_KEY = 'rtwFSXZ3nrv2uqAsuH/zqcnn9WiilF4keCDhXLfMuBYoWmh7Lt/m7JQEv3b/9A92';
const DEFAULT_WEBHOOK_SECRET = '520954f5b9300abb5cbdd3bb41d50e1e223b59cccf76a8744eea4291820d70ea';

const STARPAY_CALLBACK_URL = 'http://localhost:5000/api/payments/starpay/webhook';
const STARPAY_RETURN_URL = 'https://smartrent-et-miniapp-jade.vercel.app/pay';
const STARPAY_WEBHOOK_SECRET = process.env.STARPAY_WEBHOOK_SECRET || DEFAULT_WEBHOOK_SECRET;

/**
 * Ensures a callback URL is a valid absolute URL (http:// or https://)
 */
const ensureAbsoluteUrl = (url, defaultUrl = STARPAY_CALLBACK_URL) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return defaultUrl;
    }
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    if (trimmed.startsWith('/')) {
        const base = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || 'https://smartrent-backend.onrender.com';
        return `${base.replace(/\/+$/, '')}${trimmed}`;
    }
    return `https://${trimmed}`;
};

/**
 * Ensures a return/redirect URL is a valid absolute URL
 */
const ensureAbsoluteReturnUrl = (url, defaultUrl = STARPAY_RETURN_URL) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return defaultUrl;
    }
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    if (trimmed.startsWith('/')) {
        return `https://smartrent-et-miniapp-jade.vercel.app${trimmed}`;
    }
    return `https://${trimmed}`;
};

const getApiKey = () => process.env.STARPAY_API_KEY || process.env.STARPAY_API_SECRET || DEFAULT_SANDBOX_KEY;
const getApiUrl = () => process.env.STARPAY_API_URL || 'https://sandbox-api.starpayethiopia.com/v1/starpay-api';
const getCallbackUrl = () => ensureAbsoluteUrl(process.env.STARPAY_CALLBACK_URL);
const getReturnUrl = () => ensureAbsoluteReturnUrl(process.env.STARPAY_RETURN_URL);
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
 * Normalize Ethiopian phone number to StarPay's expected international E.164 format (+2519... or +2517...)
 */
const formatStarPayPhone = (phone) => {
    if (!phone) return '+251900000000';
    let cleaned = String(phone).trim().replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+251')) return cleaned;
    if (cleaned.startsWith('251')) return `+${cleaned}`;
    if (cleaned.startsWith('09') || cleaned.startsWith('07')) {
        return `+251${cleaned.substring(1)}`;
    }
    if (cleaned.startsWith('9') || cleaned.startsWith('7')) {
        return `+251${cleaned}`;
    }
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

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
            customerPhoneNumber: formatStarPayPhone(customerPhoneNumber),
            callbackURL: ensureAbsoluteUrl(callbackUrl || getCallbackUrl()),
            redirectUrl: ensureAbsoluteReturnUrl(redirectUrl || getReturnUrl()),
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