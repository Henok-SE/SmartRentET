const prisma = require('../config/db');

const createPayment = async ({
    contractReference,
    amount,
    paymentMethod
}) => {
    // Find the rental agreement
    const agreement = await prisma.rentalAgreement.findUnique({
        where: {
            referenceNumber
        }
    })

    if (!agreement) {
        throw new Error('Rental agreement not found');
    }
    return {
        agreementId: agreement.agreementId,
        referenceNumber: agreement.referenceNumber,
        amount,
        paymentMethod
    };
};

module.exports = {
    createPayment
};