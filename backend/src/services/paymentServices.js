const prisma = require('../config/db');

const telebirrService = require("./telebirrService");
const cbeService = require("./cbeService");

const createPayment = async ({
    referenceNumber,
    amount,
    paymentMethod,
    customerName,
    customerPhoneNumber,
    dueDate
}) => {
    // 1. Find rental agreement
    const agreement = await prisma.rentalAgreement.findUnique({
        where: {
            referenceNumber
        }
    });

    if (!agreement) {
        throw new Error('Rental agreement not found');
    }

    // 2. Select payment provider
    const provider = getPaymentProvider(paymentMethod);

    // 3. Initiate payment
    const providerResult = await provider.initiatePayment({
        amount,
        customerName,
        customerPhoneNumber,
        referenceNumber
    });

    // 4. Map payment method to Prisma enum
    const method =
        paymentMethod === "TELEBIRR"
            ? "MOBILE_MONEY"
            : "BANK_TRANSFER";

    // 5. Map provider to Prisma enum
    const paymentProvider =
        paymentMethod === "TELEBIRR"
            ? "TELEBIRR"
            : "BANK";

    // 6. Save payment in PostgreSQL
    const payment = await prisma.payment.create({
        data: {
            agreementId: agreement.agreementId,
            amount,
            dueDate: dueDate
                ? new Date(dueDate)
                : new Date(),

            status: "PENDING",

            method,
            provider: paymentProvider,

            transactionReference:
                providerResult.transactionReference,

            notes: providerResult.message
        }
    });

    // 7. Return payment result
    return {
        success: true,

        paymentId: payment.paymentId,

        agreementId: agreement.agreementId,
        referenceNumber: agreement.referenceNumber,

        amount: payment.amount,

        paymentMethod: payment.method,
        provider: payment.provider,

        status: payment.status,

        transactionReference:
            payment.transactionReference,

        message: providerResult.message
    };
};
const getPaymentHistory = async (agreementId) => {
    const agreement = await prisma.rentalAgreement.findUnique({
        where: {
            agreementId
        }
    });

    if (!agreement) {
        throw new Error('Rental agreement not found');
    }


    const payments = await prisma.payment.findMany({
        where: {
            agreementId
        },
        orderBy: {
            dueDate: 'desc'
        }
    });

    return payments;

};

const getPaymentProvider = (paymentMethod) => {
  switch (paymentMethod) {
    case "TELEBIRR":
      return telebirrService;

    case "CBE":
      return cbeService;

    default:
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
  }
};

module.exports = {
    createPayment,
    getPaymentHistory,
    getPaymentProvider
};