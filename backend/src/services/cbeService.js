// CBE provider layer

const initiatePayment = async ({
    amount,
    customerName,
    customerPhoneNumber,
    referenceNumber
}) => {
    console.log('CBE payment request:', {
        amount,
        customerName,
        customerPhoneNumber,
        referenceNumber
    });

    return {
        success: true,
        provider: 'CBE',
        status: 'PENDING',
        transactionReference: `CBE-${Date.now()}`,
        message: 'CBE payment initiated successfully'
    };
};

module.exports = {
    initiatePayment
};