// Telebirr provider layer

const initiatePayment = async ({
    amount,
    customerName,
    customerPhoneNumber,
    referenceNumber
}) => {
    console.log('Telebirr payment request:', {
        amount,
        customerName,
        customerPhoneNumber,
        referenceNumber
    });

    return {
        success: true,
        provider: 'TELEBIRR',
        status: 'PENDING',
        transactionReference: `TEL-${Date.now()}`,
        message: 'Telebirr payment initiated successfully'
    };
};

module.exports = {
    initiatePayment
};