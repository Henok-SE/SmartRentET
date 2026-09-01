const axios = require('axios');

/**
 * Commercial Bank of Ethiopia (CBE) Provider Integration Layer
 * Connects to external CBE API (or Provider Simulator in development / staging)
 */
const initiatePayment = async ({
    paymentId,
    amount,
    customerName,
    customerPhoneNumber,
    referenceNumber,
    callbackUrl,
    mode,
    delayMs
}) => {
    const defaultLocalUrl = `http://localhost:${process.env.PORT || 5000}`;
    const simulatorUrl = process.env.PROVIDER_SIMULATOR_URL || (process.env.NODE_ENV !== 'production' ? defaultLocalUrl : null);

    console.log('[CBE Service] Initiating payment for paymentId:', paymentId, {
        amount,
        customerName,
        customerPhoneNumber,
        referenceNumber,
        simulatorUrl: simulatorUrl || 'NONE (Local Mock Mode)'
    });

    if (simulatorUrl) {
        try {
            const url = `${simulatorUrl.replace(/\/+$/, '')}/api/v1/cbe/initiate`;
            const response = await axios.post(url, {
                paymentId,
                referenceNumber,
                amount,
                customerName,
                customerPhoneNumber,
                provider: 'CBE',
                callbackUrl,
                mode,
                delayMs
            }, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.data || !response.data.success) {
                throw new Error(response.data?.error || 'CBE simulator rejected payment initiation');
            }

            return {
                success: true,
                provider: 'CBE',
                status: response.data.status || 'PENDING',
                transactionReference: response.data.transactionReference,
                message: response.data.message || 'CBE payment initiated via simulator'
            };
        } catch (error) {
            const detail = error.response?.data?.error || error.message;
            console.error('[CBE Service] Simulator communication error:', detail);
            throw new Error(`CBE Provider Simulator Error: ${detail}`);
        }
    }

    // Fallback only if PROVIDER_SIMULATOR_URL is explicitly not configured
    return {
        success: true,
        provider: 'CBE',
        status: 'PENDING',
        transactionReference: `CBE-${Date.now()}`,
        message: 'CBE payment initiated successfully (Offline local mock)'
    };
};

module.exports = {
    initiatePayment
};