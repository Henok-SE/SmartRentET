const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getCodeExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

const normalizePhoneNumber = (phone) => {
  const value = String(phone || '').trim().replace(/[\s()-]/g, '');

  if (/^0[97]\d{8}$/.test(value)) {
    return `+251${value.slice(1)}`;
  }

  if (/^251[97]\d{8}$/.test(value)) {
    return `+${value}`;
  }

  if (/^\+251[97]\d{8}$/.test(value)) {
    return value;
  }

  throw new Error('Invalid Ethiopian phone number format');
};

const sendSMS = async (phone, message) => {
  const token = process.env.AFROMESSAGE_API_TOKEN;
  const identifierId = process.env.AFROMESSAGE_IDENTIFIER_ID;
  const sender = process.env.AFROMESSAGE_SENDER;

  if (!token) {
    throw new Error('AfroMessage API token is not configured');
  }

  const response = await fetch('https://api.afromessage.com/api/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...(identifierId ? { from: identifierId } : {}),
      ...(sender ? { sender } : {}),
      to: normalizePhoneNumber(phone),
      message,
      ...(process.env.AFROMESSAGE_CALLBACK_URL
        ? { callback: process.env.AFROMESSAGE_CALLBACK_URL }
        : {})
    })
  });

  const responseText = await response.text();
  let result;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error(`AfroMessage returned invalid JSON (${response.status})`);
  }

  if (!response.ok || result?.acknowledge !== 'success') {
    const providerPayload = result?.response || result;
    const providerMessage =
      providerPayload?.message ||
      providerPayload?.error ||
      providerPayload?.description ||
      result?.message;
    const detail = providerMessage ||
      (providerPayload
        ? JSON.stringify(providerPayload)
        : 'No response details returned');

    throw new Error(
      `AfroMessage rejected the SMS (${response.status}): ${detail}`
    );
  }

  return {
    success: true,
    messageId: result.response?.message_id || null,
    providerResponse: result.response
  };
};

const sendUSSD = async (phone, message) => {
  console.log(`Sending USSD to ${phone}: ${message}`);
  return { success: true, sessionId: 'USSD-' + Date.now() };
};

const sendOTP = async (phone, code) => {
  return sendSMS(phone, `Your SmartRent verification code is: ${code}. Valid for 10 minutes.`);
};

const sendNationalIdVerification = async (phone, code) => {
  return sendSMS(phone, `SmartRent: Verify your National ID with this code: ${code}. Valid for 10 minutes.`);
};

const sendUSSDVerification = async (phone, agreementId, code, expiresAt) => {
  const expiryMinutes = Math.max(
    1,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000)
  );
  const message = `SmartRent: Agreement ${agreementId}. Your verification code is ${code}. Valid for ${expiryMinutes} minutes.`;

  const smsResult = await sendSMS(phone, message);

  return {
    success: true,
    sessionId: smsResult.messageId,
    messageId: smsResult.messageId,
    providerResponse: smsResult.providerResponse
  };
};

const sendUSSDConsentWithCode = async (tenantPhone, landlordPhone, agreementId, tenantCode, landlordCode, tenantExpiry, landlordExpiry) => {
  const [tenantResult, landlordResult] = await Promise.all([
    sendUSSDVerification(
      tenantPhone,
      agreementId,
      tenantCode,
      tenantExpiry
    ),
    sendUSSDVerification(
      landlordPhone,
      agreementId,
      landlordCode,
      landlordExpiry
    )
  ]);

  return {
    success: true,
    tenantMessageId: tenantResult.messageId,
    landlordMessageId: landlordResult.messageId
  };
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
  normalizePhoneNumber,
  sendSMS,
  sendUSSD,
  sendOTP,
  sendNationalIdVerification,
  sendUSSDVerification,
  sendUSSDConsentWithCode,
  sendUSSD50BirrPayment,
  sendReferenceNumberSMS
};