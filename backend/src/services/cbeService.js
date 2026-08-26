
//This is the provider layer.

const initiatePayment = async ({
  amount,
  customerName,
  customerPhoneNumber,
  referenceNumber,
}) => {
  // This mock implementation till we configure with the real CBE API
  

  console.log("CBE payment request:", {
    amount,
    customerName,
    customerPhoneNumber,
    referenceNumber,
  });

  return {
    success: true,
    provider: "CBE",
    status: "PENDING",
    transactionReference: `CBE-${Date.now()}`,
    message: "CBE payment initiated",
  };
};

module.exports = {
  initiatePayment,
};