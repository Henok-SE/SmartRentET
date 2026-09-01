const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';
const SIMULATOR_URL = 'http://localhost:5001';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PROVIDER SIMULATOR INTEGRATION TESTS');
  console.log('====================================================');

  try {
    // 1. Health Checks
    console.log('\n1️⃣ Checking Health of Backend & Simulator...');
    const backendHealth = await axios.get(`${BACKEND_URL}/`);
    console.log('   ✅ Backend Health:', backendHealth.data.message);

    const simHealth = await axios.get(`${SIMULATOR_URL}/`);
    console.log('   ✅ Simulator Health:', simHealth.data.service);

    // 2. Set Simulator to FAST SUCCESS mode for test (1500ms delay)
    console.log('\n2️⃣ Configuring Simulator to 1.5s delay...');
    await axios.post(`${SIMULATOR_URL}/api/v1/simulate/config`, {
      delayMs: 1500,
      defaultStatus: 'SUCCESS'
    });
    console.log('   ✅ Simulator configured to 1500ms delay, SUCCESS status.');

    // 3. Inquiry
    console.log('\n3️⃣ Inquiring Lease Reference AGR-2026-X0MTKL6A...');
    const inquiryRes = await axios.get(`${BACKEND_URL}/api/payments/inquiry/AGR-2026-X0MTKL6A`);
    const inquiry = inquiryRes.data.data;
    console.log(`   ✅ Agreement found for: ${inquiry.customerName}, Amount: ${inquiry.amount} ETB`);

    // 4. Initiate Payment (Telebirr)
    console.log('\n4️⃣ Initiating Payment with Telebirr via Backend -> Simulator...');
    const initRes = await axios.post(`${BACKEND_URL}/api/payments`, {
      referenceNumber: inquiry.referenceNumber,
      amount: inquiry.amount,
      paymentMethod: 'TELEBIRR',
      customerName: inquiry.customerName,
      customerPhoneNumber: inquiry.customerPhoneNumber
    });

    const initData = initRes.data.data;
    console.log('   ✅ Payment Created in PENDING state!');
    console.log(`      paymentId: ${initData.paymentId}`);
    console.log(`      transactionReference: ${initData.transactionReference}`);
    console.log(`      status: ${initData.status}`);

    // Verify initial status via polling endpoint
    const initialStatusRes = await axios.get(`${BACKEND_URL}/api/payments/${initData.paymentId}`);
    if (initialStatusRes.data.data.status !== 'PENDING') {
      throw new Error(`Expected initial status PENDING, got: ${initialStatusRes.data.data.status}`);
    }
    console.log('   ✅ Verified payment is PENDING in PostgreSQL database.');

    // 5. Wait for simulator delay + webhook dispatch (2000ms)
    console.log('\n5️⃣ Waiting 2 seconds for Simulator asynchronous signed webhook callback...');
    await new Promise(resolve => setTimeout(resolve, 2200));

    // 6. Check updated status
    console.log('\n6️⃣ Checking Payment status after webhook processing...');
    const updatedStatusRes = await axios.get(`${BACKEND_URL}/api/payments/${initData.paymentId}`);
    const updatedPayment = updatedStatusRes.data.data;
    console.log(`   Status in DB: ${updatedPayment.status}`);
    console.log(`   Paid Date: ${updatedPayment.paidDate}`);

    if (updatedPayment.status !== 'PAID') {
      throw new Error(`Expected status to be PAID, but got: ${updatedPayment.status}`);
    }
    console.log('   ✅ SUCCESS: Payment transitioned from PENDING -> PAID with paid timestamp!');

    // 7. Test Duplicate Webhook Idempotency
    console.log('\n7️⃣ Testing Duplicate Webhook Callback (Idempotency)...');
    const duplicateRes = await axios.post(`${SIMULATOR_URL}/api/v1/simulate/callback`, {
      paymentId: initData.paymentId,
      transactionReference: initData.transactionReference,
      status: 'SUCCESS',
      amount: inquiry.amount,
      provider: 'TELEBIRR'
    });
    console.log('   ✅ Duplicate callback response:', duplicateRes.data.webhookResult.responseData?.message || duplicateRes.data.message);

    // 8. Restore Simulator default configuration (4000ms)
    await axios.post(`${SIMULATOR_URL}/api/v1/simulate/config`, {
      delayMs: 4000,
      defaultStatus: 'SUCCESS'
    });

    console.log('\n====================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
