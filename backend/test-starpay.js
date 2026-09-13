require("dotenv").config();
const axios = require("axios");

async function testStarPay() {
  const apiUrl = process.env.STARPAY_API_URL;
  const apiKey = process.env.STARPAY_API_KEY || process.env.STARPAY_API_SECRET;
  const apiSecret = process.env.STARPAY_API_SECRET;
  const merchantId = process.env.STARPAY_MERCHANT_ID;

  console.log("=================================");
  console.log("Testing StarPay API Gateway");
  console.log("API URL:", apiUrl);
  console.log("API Key:", apiKey ? `${apiKey.substring(0, 10)}...` : "MISSING");
  console.log("Merchant ID:", merchantId || "NONE");
  console.log("=================================");

  try {
    const payload = {
      amount: 100,
      description: "SmartRent Rent Settlement Test",
      currency: "ETB",
      customerName: "Henok Assefa",
      customerPhoneNumber: "+251713619167",
      callbackURL: process.env.STARPAY_CALLBACK_URL || "http://localhost:5000/api/payments/starpay/webhook",
      redirectUrl: process.env.STARPAY_RETURN_URL || "http://localhost:3000/payments/success",
      metadata: {
        agreementReference: "SR-TEST-2026-001",
        paymentId: "test-" + Date.now(),
      },
      items: [
        {
          productId: "PROD-RENT-001",
          item_name: "Monthly Rent Test",
          quantity: 1,
          unit_price: 100,
        },
      ],
    };

    const response = await axios.post(`${apiUrl}/trdp/order`, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": apiKey,
      },
      timeout: 15000,
    });

    console.log("\n=================================");
    console.log("✅ SUCCESS! StarPay Order Created!");
    console.log("=================================");
    console.log("Order ID:", response.data.data?.order_id);
    console.log("Status:", response.data.data?.status);
    console.log("Payment URL:", response.data.data?.payment_url);
    console.log("Redirect URL:", response.data.data?.redirectUrl);
    console.log("Expires At:", response.data.data?.expires_at);
    console.log("Full Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log("\n=================================");
    console.log("❌ StarPay Request Failed");
    console.log("=================================");
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`Error:`, error.message);
    }
  }
}

testStarPay();