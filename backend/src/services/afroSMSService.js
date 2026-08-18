const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getCodeExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

const sendSMS = async (phone, message) => {
  console.log(`Sending SMS to ${phone}: ${message}`);
  return { success: true, messageId: 'SIM-' + Date.now() };
};

const sendUSSD = async (phone, message) => {
  console.log(`Sending USSD to ${phone}: ${message}`);
  return { success: true, sessionId: 'USSD-' + Date.now() };
};

const sendOTP = async (phone, code) => {
  return sendSMS(phone, `Your SmartRent verification code is: ${code}. Valid for 10 minutes.`);
};

const sendUSSDVerification = async (phone, agreementId, code, expiresAt) => {
  const message = `SmartRent: Agreement #${agreementId}. Your verification code is: ${code}. Valid for 10 minutes. Reply with this code to sign.`;
  console.log(`Sending USSD to ${phone}: ${message}`);
  return { success: true, sessionId: 'USSD-' + Date.now() };
};

const sendUSSDConsentWithCode = async (tenantPhone, landlordPhone, agreementId, tenantCode, landlordCode, tenantExpiry, landlordExpiry) => {
  await sendUSSDVerification(tenantPhone, agreementId, tenantCode, tenantExpiry);
  await sendUSSDVerification(landlordPhone, agreementId, landlordCode, landlordExpiry);
  return { success: true };
};

const sendUSSD50BirrPayment = async (tenantPhone, agreementId) => {
  return sendUSSD(tenantPhone, `SmartRent: Pay 50 Birr service fee for Agreement #${agreementId}. Enter your Telebirr PIN.`);
};

const sendReferenceNumberSMS = async (tenantPhone, landlordPhone, referenceNumber) => {
  const msg = `SmartRent: Your Rental Agreement is approved. Reference: ${referenceNumber}`;
  await sendSMS(tenantPhone, msg);
  await sendSMS(landlordPhone, msg);
  return { success: true };
};

module.exports = {
  generateVerificationCode,
  getCodeExpiry,
  sendSMS,
  sendUSSD,
  sendOTP,
  sendUSSDVerification,
  sendUSSDConsentWithCode,
  sendUSSD50BirrPayment,
  sendReferenceNumberSMS
};