const prisma = require('../config/db');

const telebirrService = require('./telebirrService');
const cbeService = require('./cbeService');

// Get payment provider
const getPaymentProvider = (paymentMethod) => {
    switch (paymentMethod) {
        case 'TELEBIRR':
            return telebirrService;

        case 'CBE':
            return cbeService;

        default:
            throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
};

// Create payment
const createPayment = async ({
    referenceNumber,
    amount,
    paymentMethod,
    customerName,
    customerPhoneNumber,
    dueDate
}) => {
    // Validate required fields
    if (!referenceNumber) {
        throw new Error('Reference number is required');
    }

    if (!amount || Number(amount) <= 0) {
        throw new Error('Payment amount must be greater than zero');
    }

    if (!paymentMethod) {
        throw new Error('Payment method is required');
    }

    if (!customerName) {
        throw new Error('Customer name is required');
    }

    if (!customerPhoneNumber) {
        throw new Error('Customer phone number is required');
    }

    // Find rental agreement
    const agreement = await prisma.rentalAgreement.findUnique({
        where: {
            referenceNumber
        }
    });

    if (!agreement) {
        throw new Error('Rental agreement not found');
    }

    // Check agreement status
    if (
        agreement.status !== 'ACTIVE' &&
        agreement.status !== 'APPROVED'
    ) {
        throw new Error('Payment cannot be made for this agreement');
    }

    // Validate exact payment amount
    const paymentAmount = Number(amount);
    const rentalAmount = Number(agreement.rentalAmount);

    if (paymentAmount !== rentalAmount) {
        throw new Error(
            `Payment amount must be exactly ${rentalAmount}`
        );
    }

    // Check for existing active payment
    const existingPayment = await prisma.payment.findFirst({
        where: {
            agreementId: agreement.agreementId,
            status: {
                in: ['PENDING', 'PAID']
            }
        }
    });

    if (existingPayment) {
        throw new Error(
            'A payment already exists for this agreement'
        );
    }

    // Select provider
    const provider = getPaymentProvider(paymentMethod);

    // Initiate payment
    const providerResult = await provider.initiatePayment({
        amount: paymentAmount,
        customerName,
        customerPhoneNumber,
        referenceNumber
    });

    if (!providerResult || !providerResult.success) {
        throw new Error(
            providerResult?.message ||
            'Payment provider failed to initiate payment'
        );
    }

    // Map payment method
    let method;

    if (paymentMethod === 'TELEBIRR') {
        method = 'MOBILE_MONEY';
    } else if (paymentMethod === 'CBE') {
        method = 'BANK_TRANSFER';
    }

    // Map payment provider
    let paymentProvider;

    if (paymentMethod === 'TELEBIRR') {
        paymentProvider = 'TELEBIRR';
    } else if (paymentMethod === 'CBE') {
        paymentProvider = 'BANK';
    }

    // Save payment
    const payment = await prisma.payment.create({
        data: {
            agreementId: agreement.agreementId,
            amount: paymentAmount,
            dueDate: dueDate
                ? new Date(dueDate)
                : new Date(),
            status: 'PENDING',
            method,
            provider: paymentProvider,
            transactionReference:
                providerResult.transactionReference,
            notes: providerResult.message
        }
    });

    // Return payment
    return {
        success: true,
        paymentId: payment.paymentId,
        agreementId: agreement.agreementId,
        referenceNumber: agreement.referenceNumber,
        amount: payment.amount,
        paymentMethod: payment.method,
        provider: payment.provider,
        status: payment.status,
        transactionReference: payment.transactionReference,
        message: providerResult.message
    };
};

// Get payment history
const getPaymentHistory = async (agreementId) => {
    if (!agreementId) {
        throw new Error('Agreement ID is required');
    }

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

// Get single payment
const getPaymentById = async (paymentId) => {
    if (!paymentId) {
        throw new Error('Payment ID is required');
    }

    const payment = await prisma.payment.findUnique({
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
        throw new Error('Payment not found');
    }

    return payment;
};

// Update payment status
const updatePaymentStatus = async ({
    paymentId,
    status,
    transactionReference
}) => {
    if (!paymentId) {
        throw new Error('Payment ID is required');
    }

    if (!status) {
        throw new Error('Payment status is required');
    }

    const allowedStatuses = [
        'PENDING',
        'PAID',
        'FAILED',
        'CANCELLED'
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error(`Invalid payment status: ${status}`);
    }

    const payment = await prisma.payment.findUnique({
        where: {
            paymentId
        }
    });

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.status !== 'PENDING') {
        throw new Error(
            `Payment cannot be changed from ${payment.status}`
        );
    }

    if (status === 'PAID' && !transactionReference) {
        throw new Error(
            'Transaction reference is required when marking payment as PAID'
        );
    }

    const updatedPayment = await prisma.payment.update({
        where: {
            paymentId
        },
        data: {
            status,
            transactionReference:
                transactionReference ||
                payment.transactionReference,
            paidDate:
                status === 'PAID'
                    ? new Date()
                    : null
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