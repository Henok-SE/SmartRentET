const createPayment = async ({
    contractReference,
    amount,
    paymentMethod
}) => {
    return {
        contractReference,
        amount,
        paymentMethod
    };
};

module.exports = {
    createPayment
};