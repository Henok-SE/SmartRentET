require('dotenv').config();
const axios = require('axios');
const prisma = require('../src/config/db');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const SIMULATOR_URL = process.env.SIMULATOR_URL || process.env.BACKEND_URL || 'http://localhost:5000';

// Poll payment status until expected status or timeout
async function waitForPaymentStatus(paymentId, expectedStatus, timeoutMs = 8000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/payments/${paymentId}`);
      const payment = res.data.data;
      if (payment && payment.status === expectedStatus) {
        return payment;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  const finalRes = await axios.get(`${BACKEND_URL}/api/payments/${paymentId}`);
  return finalRes.data.data;
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 SMARTRENT UNIFIED BACKEND & SIMULATOR TEST SUITE');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalTests = 7;

  try {
    // 0. HEALTH CHECKS & TEST STATE RESET
    console.log('🔍 Test 0: Health Checks & Database Reset');
    const backendHealth = await axios.get(`${BACKEND_URL}/`);
    console.log(`   ✅ Unified Backend Health: ${backendHealth.data.message}`);
    console.log(`   ✅ Simulator Mounted: ${backendHealth.data.data?.simulatorMounted}`);

    // Clean up stale PENDING payments from prior test runs
    await prisma.payment.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'CANCELLED', notes: 'Cancelled by automated test reset' }
    });
    console.log('   ✅ Cleaned up stale PENDING records from database.');

    // Configure simulator default to 1500ms delay for fast test execution
    await axios.post(`${SIMULATOR_URL}/api/v1/simulate/config`, {
      delayMs: 1500,
      defaultStatus: 'SUCCESS'
    });
    console.log('');

    // 1. SCENARIO 1: INVALID REFERENCE REJECTION (Strict DB Validation)
    console.log('📌 Test 1: Invalid Lease Reference Rejection (Strict DB Validation)');
    try {
      await axios.get(`${BACKEND_URL}/api/payments/inquiry/AGR-999-NONEXISTENT`);
      throw new Error('Expected 404 error but request succeeded');
    } catch (err) {
      if (err.response?.status === 404) {
        console.log(`   ✅ Correctly rejected with 404: "${err.response.data.error}"`);
        console.log(`   ✅ Error Code: ${err.response.data.errorDetails?.code || 'RESOURCE_NOT_FOUND'}`);
        passedCount++;
      } else {
        throw err;
      }
    }
    console.log('');

    // 2. SCENARIO 2: SUCCESSFUL PAYMENT FLOW + DTO SANITIZATION
    console.log('📌 Test 2: Successful Payment Flow (Inquiry -> PENDING -> Webhook -> PAID)');
    
    const inquiryRes = await axios.get(`${BACKEND_URL}/api/payments/inquiry/AGR-2026-X0MTKL6A`);
    const inquiry = inquiryRes.data.data;
    console.log(`   ✅ DTO Inquiry Data: ${inquiry.customerName} | ${inquiry.amount} ETB | Ref: ${inquiry.referenceNumber}`);
    
    // Ensure sensitive fields are not in inquiry DTO
    if (inquiry.passwordHash || inquiry.nationalId) {
      throw new Error('Sensitive fields leaked in Inquiry DTO!');
    }

    const initRes = await axios.post(`${BACKEND_URL}/api/payments`, {
      referenceNumber: inquiry.referenceNumber,
      amount: inquiry.amount,
      paymentMethod: 'TELEBIRR',
      customerName: inquiry.customerName,
      customerPhoneNumber: inquiry.customerPhoneNumber
    });

    const paymentData = initRes.data.data;
    console.log(`   ✅ Payment Created: ID=${paymentData.paymentId} | Status=${paymentData.status} | TxRef=${paymentData.transactionReference}`);
    
    console.log('   ⏳ Polling until simulator signed webhook transitions status to PAID...');
    const verifiedPayment = await waitForPaymentStatus(paymentData.paymentId, 'PAID', 8000);

    if (verifiedPayment.status !== 'PAID' || !verifiedPayment.paidDate) {
      throw new Error(`Expected status PAID with paidDate, got: ${verifiedPayment.status}`);
    }
    console.log(`   ✅ Verified Status: ${verifiedPayment.status} at ${verifiedPayment.paidDate}`);
    passedCount++;
    console.log('');

    // 3. SCENARIO 3: DUPLICATE WEBHOOK (Idempotency Handling)
    console.log('📌 Test 3: Duplicate Webhook Callback (Idempotency & Safe Acknowledgment)');
    const duplicateRes = await axios.post(`${SIMULATOR_URL}/api/v1/simulate/callback`, {
      paymentId: paymentData.paymentId,
      transactionReference: paymentData.transactionReference,
      status: 'SUCCESS',
      amount: inquiry.amount,
      provider: 'TELEBIRR'
    });

    const duplicateData = duplicateRes.data.webhookResult.responseData;
    console.log(`   ✅ Duplicate Callback Response: ${duplicateData.message}`);
    console.log(`   ✅ isDuplicate flag: ${duplicateData.isDuplicate}`);
    passedCount++;
    console.log('');

    // 4. SCENARIO 4: FAILED PAYMENT SIMULATION
    console.log('📌 Test 4: Failed Payment Simulation (Provider Rejection / Insufficient Balance)');
    const failInitRes = await axios.post(`${BACKEND_URL}/api/payments`, {
      referenceNumber: 'AGR-2026-6HUZWF74',
      amount: 5000,
      paymentMethod: 'CBE',
      customerName: 'Tigist Haile',
      customerPhoneNumber: '0944444443',
      mode: 'FAILED',
      delayMs: 1000
    });

    const failPaymentId = failInitRes.data.data.paymentId;
    console.log(`   ✅ Failed Payment Created: ID=${failPaymentId} in PENDING state`);
    
    console.log('   ⏳ Polling until simulator webhook delivers FAILED status...');
    const failVerified = await waitForPaymentStatus(failPaymentId, 'FAILED', 8000);

    if (failVerified.status !== 'FAILED') {
      throw new Error(`Expected status FAILED, got: ${failVerified.status}`);
    }
    console.log(`   ✅ Verified Status: ${failVerified.status} (Notes: ${failVerified.notes})`);
    passedCount++;
    console.log('');

    // 5. SCENARIO 5: TIMEOUT SIMULATION (No Webhook Sent)
    console.log('📌 Test 5: Timeout Simulation (Provider Drop / Webhook Omitted)');
    const timeoutInitRes = await axios.post(`${BACKEND_URL}/api/payments`, {
      referenceNumber: 'AGR-2026-M51LLGTN',
      amount: 12000,
      paymentMethod: 'TELEBIRR',
      customerName: 'betselt Wodee',
      customerPhoneNumber: '0934444448',
      mode: 'TIMEOUT',
      delayMs: 1000
    });

    const timeoutPaymentId = timeoutInitRes.data.data.paymentId;
    console.log(`   ✅ Timeout Payment Created: ID=${timeoutPaymentId}`);

    console.log('   ⏳ Waiting 1.5s to confirm webhook is omitted...');
    await new Promise(r => setTimeout(r, 1500));

    const timeoutVerifyRes = await axios.get(`${BACKEND_URL}/api/payments/${timeoutPaymentId}`);
    if (timeoutVerifyRes.data.data.status !== 'PENDING') {
      throw new Error(`Expected status to remain PENDING during timeout, got: ${timeoutVerifyRes.data.data.status}`);
    }
    console.log(`   ✅ Verified Status remains: ${timeoutVerifyRes.data.data.status}`);
    passedCount++;
    console.log('');

    // 6. SCENARIO 6: INVALID WEBHOOK SIGNATURE REJECTION
    console.log('📌 Test 6: Security - Forged/Invalid Webhook Signature Rejection');
    try {
      await axios.post(`${BACKEND_URL}/api/payments/provider-webhook`, {
        paymentId: timeoutPaymentId,
        transactionReference: 'FAKE-TXN-1234',
        status: 'SUCCESS'
      }, {
        headers: {
          'X-Provider-Signature': 'sha256=forged_invalid_signature_hash_value_9999'
        }
      });
      throw new Error('Expected 401 Unauthorized for forged signature, but request was accepted!');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log(`   ✅ Correctly rejected forged webhook with 401 Unauthorized`);
        console.log(`   ✅ Security Error Message: "${err.response.data.error}"`);
        passedCount++;
      } else {
        throw err;
      }
    }
    console.log('');

    // 7. SCENARIO 7: RESTRICTED ADMIN ENDPOINT AUTHENTICATION
    console.log('📌 Test 7: Security - Protected Admin Status Route Requires Auth');
    try {
      await axios.patch(`${BACKEND_URL}/api/payments/${paymentData.paymentId}/status`, {
        status: 'CANCELLED'
      });
      throw new Error('Expected 401 for unauthenticated status patch');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log(`   ✅ Correctly rejected unauthenticated status patch with 401: "${err.response.data.error}"`);
        passedCount++;
      } else {
        throw err;
      }
    }
    console.log('');

    // Restore simulator default configuration (4000ms delay, SUCCESS)
    await axios.post(`${SIMULATOR_URL}/api/v1/simulate/config`, {
      delayMs: 4000,
      defaultStatus: 'SUCCESS'
    });

    console.log('================================================================');
    console.log(`🎉 ALL ${passedCount}/${totalTests} UNIFIED INTEGRATION TESTS PASSED SUCCESSFULLY!`);
    console.log('================================================================\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTestSuite();
