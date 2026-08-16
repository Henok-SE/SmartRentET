const prisma = require('../config/db');

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
  sendSMS,
  sendUSSD,
  sendOTP,
  sendUSSDConsent,
  sendUSSD50BirrPayment,
  sendReferenceNumberSMS
};