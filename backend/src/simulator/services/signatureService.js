const crypto = require('crypto');
const config = require('../config');

/**
 * Generate HMAC-SHA256 signature for provider webhook payloads
 * @param {object|string} payload 
 * @param {string} secret 
 * @returns {string} sha256=...
 */
function generateSignature(payload, secret = config.signatureSecret) {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(content);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify HMAC-SHA256 signature
 * @param {object|string} payload 
 * @param {string} signatureHeader 
 * @param {string} secret 
 * @returns {boolean}
 */
function verifySignature(payload, signatureHeader, secret = config.signatureSecret) {
  if (!signatureHeader) return false;
  const expected = generateSignature(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

module.exports = {
  generateSignature,
  verifySignature
};
