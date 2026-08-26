const prisma = require('../config/db');

const telebirrService = require('./telebirrService');
const cbeService = require('./cbeService');

// GET PAYMENT PROVIDER

const getPaymentProvider = (paymentMethod) => {

    switch (paymentMethod) {

        case "TELEBIRR":
            return telebirrService;

        case "CBE":
            return cbeService;

        default:
            throw new Error(
                `Unsupported payment method: ${paymentMethod}`
            );
    }
};

// CREATE PAYMENT

const createPayment = async ({
    referenceNumber,
    amount,
    paymentMethod,
    customerName,
    customerPhoneNumber,
    dueDate
}) => {

    // 1. Validate required fields

    if (!referenceNumber) {
        throw new Error("Reference number is required");
    }

    if (!amount || Number(amount) <= 0) {
        throw new Error("Payment amount must be greater than zero");
    }

    if (!paymentMethod) {
        throw new Error("Payment method is required");
    }

    if (!customerName) {
        throw new Error("Customer name is required");
    }

    if (!customerPhoneNumber) {
        throw new Error("Customer phone number is required");
    }

    // 2. Find rental agreement

    const agreement = await prisma.rentalAgreement.findUnique({
        where: {
            referenceNumber
        }
    });

    if (!agreement) {
        throw new Error("Rental agreement not found");
    }

    // 3. Make sure agreement can receive payments
    
    if (
        agreement.status !== "ACTIVE" &&
        agreement.status !== "APPROVED"
    ) {
        throw new Error(
            "Payment cannot be made for this agreement"
        );
    }


    
    // 4. Select provider

    const provider = getPaymentProvider(paymentMethod);
  
    // 5. Initiate payment with provider

    const providerResult = await provider.initiatePayment({

        amount: Number(amount),

        customerName,

        customerPhoneNumber,

        referenceNumber
    });

    if (!providerResult || !providerResult.success) {

        throw new Error(
            providerResult?.message ||
            "Payment provider failed to initiate payment"
        );
    }

    // 6. Map payment method to Prisma enum

    let method;

    if (paymentMethod === "TELEBIRR") {

        method = "MOBILE_MONEY";

    } else if (paymentMethod === "CBE") {

        method = "BANK_TRANSFER";

    } else {

        throw new Error(
            `Unsupported payment method: ${paymentMethod}`
        );
    }

    // 7. Map provider to Prisma enum

    let paymentProvider;

    if (paymentMethod === "TELEBIRR") {

        paymentProvider = "TELEBIRR";

    } else if (paymentMethod === "CBE") {

        paymentProvider = "BANK";

    } else {

        throw new Error(
            `Unsupported payment method: ${paymentMethod}`
        );
    }

    // 8. Save payment in PostgreSQL

    const payment = await prisma.payment.create({

        data: {

            agreementId:
                agreement.agreementId,

            amount:
                Number(amount),

            dueDate:
                dueDate
                    ? new Date(dueDate)
                    : new Date(),

            status:
                "PENDING",

            method,

            provider:
                paymentProvider,

            transactionReference:
                providerResult.transactionReference,

            notes:
                providerResult.message
        }
    });
 
    // 9. Return result

    return {

        success: true,

        paymentId:
            payment.paymentId,

        agreementId:
            agreement.agreementId,

        referenceNumber:
            agreement.referenceNumber,

        amount:
            payment.amount,

        paymentMethod:
            payment.method,

        provider:
            payment.provider,

        status:
            payment.status,

        transactionReference:
            payment.transactionReference,

        message:
            providerResult.message
    };
};

// GET PAYMENT HISTORY

const getPaymentHistory = async (agreementId) => {

    if (!agreementId) {
        throw new Error("Agreement ID is required");
    }

    // Verify agreement exists

    const agreement =
        await prisma.rentalAgreement.findUnique({

            where: {
                agreementId
            }
        });


    if (!agreement) {
        throw new Error(
            "Rental agreement not found"
        );
    }

    // Get payments

    const payments =
        await prisma.payment.findMany({

            where: {
                agreementId
            },

            orderBy: {
                dueDate: "desc"
            }
        });


    return payments;
};

// GET SINGLE PAYMENT

const getPaymentById = async (paymentId) => {

    const payment =
        await prisma.payment.findUnique({

            where: {
                paymentId
            },

            include: {

                agreement: {
                    select: {
                        agreementId: true,
                        referenceNumber: true,
                        rentalAmount: true,
                        status: true
                    }
                }
            }
        });


    if (!payment) {
        throw new Error(
            "Payment not found"
        );
    }


    return payment;
};

// UPDATE PAYMENT STATUS

const updatePaymentStatus = async ({
    paymentId,
    status,
    transactionReference
}) => {

    const allowedStatuses = [
        "PENDING",
        "PAID",
        "FAILED",
        "CANCELLED",
        "OVERDUE"
    ];


    if (!allowedStatuses.includes(status)) {

        throw new Error(
            `Invalid payment status: ${status}`
        );
    }


    const payment =
        await prisma.payment.findUnique({

            where: {
                paymentId
            }
        });


    if (!payment) {
        throw new Error(
            "Payment not found"
        );
    }


    const updatedPayment =
        await prisma.payment.update({

            where: {
                paymentId
            },

            data: {

                status,

                transactionReference:
                    transactionReference ||
                    payment.transactionReference,

                paidDate:
                    status === "PAID"
                        ? new Date()
                        : payment.paidDate
            }
        });


    return updatedPayment;
};


module.exports = {

    createPayment,

    getPaymentHistory,

    getPaymentById,

    updatePaymentStatus,

    getPaymentProvider
};