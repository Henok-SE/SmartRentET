const prisma = require('../config/db');

const generateVerificationCode = () => {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `${part1}-${part2}`;
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
  return sendSMS(phone, `Your SmartRent verification code is: ${code}. Valid for 5 minutes.`);
};

const sendUSSDVerification = async (phone, agreementId, code) => {
  const message = `SmartRent: Your Rental Agreement #${agreementId} verification code is: ${code}. Reply with this code to sign.`;
  console.log(`📱 Sending USSD to ${phone}: ${message}`);
  return { success: true, sessionId: 'USSD-' + Date.now(), phone, code };
};

const sendUSSDConsentWithCode = async (tenantPhone, landlordPhone, agreementId, tenantCode, landlordCode) => {
  await sendUSSDVerification(tenantPhone, agreementId, tenantCode);
  await sendUSSDVerification(landlordPhone, agreementId, landlordCode);
  return { success: true };
};

const sendUSSDConsent = async (tenantPhone, landlordPhone, agreementId) => {
  await sendUSSD(tenantPhone, `SmartRent: Do you agree to Rental Agreement #${agreementId}? Reply YES or NO.`);
  await sendUSSD(landlordPhone, `SmartRent: Do you agree to Rental Agreement #${agreementId}? Reply YES or NO.`);
  return { success: true };
};

const sendUSSD50BirrPayment = async (landlordPhone, agreementId) => {
  return sendUSSD(landlordPhone, `SmartRent: Pay 50 Birr government fee for Agreement #${agreementId}. Reply with your Telebirr PIN.`);
};

const sendReferenceNumberSMS = async (tenantPhone, landlordPhone, referenceNumber) => {
  const msg = `SmartRent: Your Rental Agreement is approved. Reference: ${referenceNumber}`;
  await sendSMS(tenantPhone, msg);
  await sendSMS(landlordPhone, msg);
  return { success: true };
};

module.exports = {
  generateVerificationCode,
  sendSMS,
  sendUSSD,
  sendOTP,
  sendUSSDVerification,
  sendUSSDConsentWithCode,
  sendUSSDConsent,
  sendUSSD50BirrPayment,
  sendReferenceNumberSMS
};