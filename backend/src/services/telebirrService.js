
//This is the provider layer.
 

const initiatePayment = async ({
  amount,
  customerName,
  customerPhoneNumber,
  referenceNumber,
}) => {
  
  // This mock implementation till we configure with the real Telebirr API


  console.log("Telebirr payment request:", {
    amount,
    customerName,
    customerPhoneNumber,
    referenceNumber,
  });

  return {
    success: true,
    provider: "TELEBIRR",
    status: "PENDING",
    transactionReference: `TEL-${Date.now()}`,
    message: "Telebirr payment initiated",
  };
};

module.exports = {
  initiatePayment,
};