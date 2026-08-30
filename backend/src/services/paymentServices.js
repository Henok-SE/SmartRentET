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

// Get payment due information
const getPaymentInquiry = async (referenceNumber) => {
    if (!referenceNumber) {
        throw new Error('Reference number is required');
    }

    const agreement = await prisma.rentalAgreement.findUnique({
        where: {
            referenceNumber
        },
        include: {
            tenant: {
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phone: true
                        }
                    }
                }
            },
            paymentFrequency: true
        }
    });

    if (!agreement) {
        throw new Error('Rental agreement not found');
    }

    if (
        agreement.status !== 'ACTIVE' &&
        agreement.status !== 'APPROVED'
    ) {
        throw new Error('Payment cannot be made for this agreement');
    }

    const latestPayment = await prisma.payment.findFirst({
        where: {
            agreementId: agreement.agreementId
        },
        orderBy: {
            dueDate: 'desc'
        }
    });

    if (latestPayment && latestPayment.status === 'PENDING') {
        throw new Error('A payment is already pending for this agreement');
    }

    const amount = Number(agreement.rentalAmount);

    let dueDate = agreement.effectiveDate;

    if (latestPayment && latestPayment.status === 'PAID') {
        dueDate = new Date(latestPayment.dueDate);
        dueDate.setDate(
            dueDate.getDate() +
            agreement.paymentFrequency.minimumInterval
        );
    }

    return {
        referenceNumber: agreement.referenceNumber,
        agreementId: agreement.agreementId,
        customerName:
            `${agreement.tenant.user.firstName} ${agreement.tenant.user.lastName}`,
        customerPhoneNumber: agreement.tenant.user.phone,
        amount,
        currency: 'ETB',
        dueDate,
        description: 'Rental payment'
    };
};

// Create payment
const createPayment = async ({
    referenceNumber,
    amount,
    paymentMethod,
    customerName,
    customerPhoneNumber
}) => {
    if (!referenceNumber) {
        throw new Error('Reference number is required');
    }

    if (!amount || Number(amount) <= 0) {
        throw new Error('Payment amount must be greater than zero');
    }

    if (!paymentMethod) {
        throw new Error('Payment method is required');
    }

    const inquiry = await getPaymentInquiry(referenceNumber);

    const paymentAmount = Number(amount);

    if (paymentAmount !== inquiry.amount) {
        throw new Error(
            `Payment amount must be exactly ${inquiry.amount} ETB`
        );
    }

    const provider = getPaymentProvider(paymentMethod);

    const providerResult = await provider.initiatePayment({
        amount: inquiry.amount,
        customerName:
            customerName || inquiry.customerName,
        customerPhoneNumber:
            customerPhoneNumber || inquiry.customerPhoneNumber,
        referenceNumber
    });

    if (!providerResult || !providerResult.success) {
        throw new Error(
            providerResult?.message ||
            'Payment provider failed to initiate payment'
        );
    }

    const method =
        paymentMethod === 'TELEBIRR'
            ? 'MOBILE_MONEY'
            : 'BANK_TRANSFER';

    const paymentProvider =
        paymentMethod === 'TELEBIRR'
            ? 'TELEBIRR'
            : 'BANK';

    const payment = await prisma.payment.create({
        data: {
            agreementId: inquiry.agreementId,
            amount: inquiry.amount,
            dueDate: inquiry.dueDate,
            status: 'PENDING',
            method,
            provider: paymentProvider,
            transactionReference:
                providerResult.transactionReference,
            notes: providerResult.message
        }
    });

    return {
        success: true,
        paymentId: payment.paymentId,
        agreementId: inquiry.agreementId,
        referenceNumber: inquiry.referenceNumber,
        amount: payment.amount,
        currency: 'ETB',
        paymentMethod: payment.method,
        provider: payment.provider,
        status: payment.status,
        transactionReference:
            payment.transactionReference,
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

    return prisma.payment.findMany({
        where: {
            agreementId
        },
        orderBy: {
            dueDate: 'desc'
        }
    });
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

    return prisma.payment.update({
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
};

// Handle mock provider callback
const handleMockPaymentCallback = async ({
    paymentId,
    transactionReference,
    status
}) => {
    if (!paymentId) {
        throw new Error('Payment ID is required');
    }

    if (!transactionReference) {
        throw new Error('Transaction reference is required');
    }

    if (status !== 'SUCCESS' && status !== 'FAILED') {
        throw new Error('Invalid callback status');
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

    if (
        payment.transactionReference !== transactionReference
    ) {
        throw new Error(
            'Transaction reference does not match payment'
        );
    }

    const updatedPayment = await prisma.payment.update({
        where: {
            paymentId
        },
        data: {
            status: status === 'SUCCESS' ? 'PAID' : 'FAILED',
            paidDate:
                status === 'SUCCESS'
                    ? new Date()
                    : null
        }
    });

    return updatedPayment;
};

module.exports = {
    createPayment,
    getPaymentInquiry,
    getPaymentHistory,
    getPaymentById,
    updatePaymentStatus,
    handleMockPaymentCallback,
    getPaymentProvider
};