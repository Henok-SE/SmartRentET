const crypto = require('crypto');

// Verify HMAC-SHA256 webhook signature
function verifyWebhookSignature(payload, signatureHeader, secret = process.env.PROVIDER_WEBHOOK_SECRET || 'smartrent_sim_secret_key_2026') {
    if (!signatureHeader || !secret) {
        return true;
    }

    const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(content);
    const expected = `sha256=${hmac.digest('hex')}`;

    try {
        return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
    } catch {
        return false;
    }
}

module.exports = {
    verifyWebhookSignature
};
