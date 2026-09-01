const axios = require('axios');

// Telebirr provider integration layer
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

    console.log('[Telebirr Service] Initiating payment for paymentId:', paymentId, {
        amount,
        customerName,
        customerPhoneNumber,
        referenceNumber,
        simulatorUrl: simulatorUrl || 'NONE (Local Mock Mode)'
    });

    if (simulatorUrl) {
        try {
            const url = `${simulatorUrl.replace(/\/+$/, '')}/api/v1/telebirr/initiate`;
            const response = await axios.post(url, {
                paymentId,
                referenceNumber,
                amount,
                customerName,
                customerPhoneNumber,
                provider: 'TELEBIRR',
                callbackUrl,
                mode,
                delayMs
            }, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.data || !response.data.success) {
                throw new Error(response.data?.error || 'Telebirr simulator rejected payment initiation');
            }

            return {
                success: true,
                provider: 'TELEBIRR',
                status: response.data.status || 'PENDING',
                transactionReference: response.data.transactionReference,
                message: response.data.message || 'Telebirr payment initiated via simulator'
            };
        } catch (error) {
            const detail = error.response?.data?.error || error.message;
            console.error('[Telebirr Service] Simulator communication error:', detail);
            throw new Error(`Telebirr Provider Simulator Error: ${detail}`);
        }
    }

    // Fallback offline mock response
    return {
        success: true,
        provider: 'TELEBIRR',
        status: 'PENDING',
        transactionReference: `TEL-${Date.now()}`,
        message: 'Telebirr payment initiated successfully (Offline local mock)'
    };
};

module.exports = {
    initiatePayment
};