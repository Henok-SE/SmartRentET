require("dotenv").config();
const axios = require("axios");

async function testStarPay() {
  try {
    const apiUrl = process.env.STARPAY_API_URL;
    const apiSecret = process.env.STARPAY_API_SECRET;

    if (!apiUrl) {
      throw new Error("STARPAY_API_URL is missing from .env");
    }

    if (!apiSecret) {
      throw new Error("STARPAY_API_SECRET is missing from .env");
    }

    const response = await axios.post(
      `${apiUrl}/trdp/order`,
      {
        amount: 100,
        description: "SmartRent ET Test Payment",
        currency: "ETB",

        customerName: "SmartRent Test Tenant",
        customerPhoneNumber: "+251900000000",

        items: [
          {
            name: "Monthly Rent",
            quantity: 1,
            price: 100,
          },
        ],

        // Optional for now
        metadata: {
          agreementReference: "TEST-AGREEMENT-001",
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-secret": apiSecret,
        },
      }
    );

    console.log("=================================");
    console.log("StarPay test successful!");
    console.log("=================================");
    console.log("HTTP Status:", response.status);
    console.log("Response:");
    console.dir(response.data, { depth: null });
  } catch (error) {
    console.log("=================================");
    console.log("StarPay test failed");
    console.log("=================================");

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Data:");
      console.dir(error.response.data, { depth: null });
    } else {
      console.log("Error:", error.message);
    }
  }
}

testStarPay();