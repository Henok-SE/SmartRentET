require('dotenv').config();
const crypto = require('crypto');
const starpayService = require('./src/services/starpayService');

async function testStarPayFlow() {
  console.log('====================================================');
  console.log('🧪 TESTING STARPAY END-TO-END SERVICE INTEGRATION');
  console.log('====================================================');

  try {
    // 1. Test Order Initiation via Starpay Service
    console.log('\n1️⃣ Calling starpayService.initiatePayment()...');
    const paymentResult = await starpayService.initiatePayment({
      paymentId: 'PAY-TEST-' + Date.now(),
      amount: 150,
      customerName: 'Henok Assefa',
      customerPhoneNumber: '+251713619167',
      referenceNumber: 'AGR-2026-X0MTKL6A',
      description: 'Test Monthly Rent Settlement',
    });

    console.log('   ✅ StarPay Order Initiation Successful!');
    console.log(`      Provider: ${paymentResult.provider}`);
    console.log(`      Status: ${paymentResult.status}`);
    console.log(`      Transaction / Order ID: ${paymentResult.transactionReference}`);
    console.log(`      Checkout / Payment URL: ${paymentResult.checkoutUrl}`);
    console.log(`      Redirect URL: ${paymentResult.redirectUrl}`);
    console.log(`      Expires At: ${paymentResult.expiresAt}`);

    if (!paymentResult.checkoutUrl || !paymentResult.transactionReference) {
      throw new Error('StarPay order initiation did not return expected orderId or checkoutUrl');
    }

    // 2. Test HMAC Webhook Signature Verification
    console.log('\n2️⃣ Testing StarPay Webhook Signature Verification...');
    const secret = process.env.STARPAY_WEBHOOK_SECRET;
    const testPayload = {
      order_id: paymentResult.transactionReference,
      status: 'PAID',
      amount: '150',
      currency: 'ETB',
      metadata: { paymentId: 'PAY-TEST-123' },
    };

    const content = JSON.stringify(testPayload);
    const validSignature = crypto.createHmac('sha256', secret).update(content).digest('hex');

    const isValid = starpayService.verifyWebhookSignature(testPayload, validSignature, secret);
    console.log(`   ✅ Valid Signature Check: ${isValid ? 'PASSED (Signature verified)' : 'FAILED'}`);

    const isInvalidRejected = !starpayService.verifyWebhookSignature(testPayload, 'forged_signature_123', secret);
    console.log(`   ✅ Forged Signature Rejection: ${isInvalidRejected ? 'PASSED (Forged signature rejected)' : 'FAILED'}`);

    if (!isValid || !isInvalidRejected) {
      throw new Error('Webhook signature verification logic failed');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL STARPAY INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (error) {
    console.error('\n❌ StarPay Flow Test Failed:', error.message);
    process.exit(1);
  }
}

testStarPayFlow();
