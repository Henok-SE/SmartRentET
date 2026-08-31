const prisma = require('../config/db');
const telebirrService = require('./telebirrService');
const cbeService = require('./cbeService');
const agreementService = require('./agreementService');
const afroSMSService = require('./afroSMSService');

// ============================================
// GET PAYMENT PROVIDER
// ============================================

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

// ============================================
// GET PAYMENT INQUIRY
// ============================================

const getPaymentInquiry = async (referenceNumber) => {
    if (!referenceNumber) {
        throw new Error('Reference number is required');
    }

    const agreement = await prisma.rentalAgreement.findUnique({
        where: { referenceNumber },
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

    if (agreement.status !== 'ACTIVE' && agreement.status !== 'APPROVED') {
        throw new Error('Payment cannot be made for this agreement');
    }

    const latestPayment = await prisma.payment.findFirst({
        where: { agreementId: agreement.agreementId },
        orderBy: { dueDate: 'desc' }
    });

    if (latestPayment && latestPayment.status === 'PENDING') {
        throw new Error('A payment is already pending for this agreement');
    }

    const amount = Number(agreement.rentalAmount);
    let dueDate = agreement.effectiveDate;

    if (latestPayment && latestPayment.status === 'PAID') {
        dueDate = new Date(latestPayment.dueDate);
        dueDate.setDate(dueDate.getDate() + agreement.paymentFrequency.minimumInterval);
    }

    return {
        referenceNumber: agreement.referenceNumber,
        agreementId: agreement.agreementId,
        customerName: `${agreement.tenant.user.firstName} ${agreement.tenant.user.lastName}`,
        customerPhoneNumber: agreement.tenant.user.phone,
        amount,
        currency: 'ETB',
        dueDate,
        description: 'Rental payment'
    };
};

// ============================================
// CREATE PAYMENT
// ============================================

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
        throw new Error(`Payment amount must be exactly ${inquiry.amount} ETB`);
    }

    const provider = getPaymentProvider(paymentMethod);
    const providerResult = await provider.initiatePayment({
        amount: inquiry.amount,
        customerName: customerName || inquiry.customerName,
        customerPhoneNumber: customerPhoneNumber || inquiry.customerPhoneNumber,
        referenceNumber
    });

    if (!providerResult || !providerResult.success) {
        throw new Error(providerResult?.message || 'Payment provider failed to initiate payment');
    }

    const method = paymentMethod === 'TELEBIRR' ? 'MOBILE_MONEY' : 'BANK_TRANSFER';
    const paymentProvider = paymentMethod === 'TELEBIRR' ? 'TELEBIRR' : 'BANK';

    const payment = await prisma.payment.create({
        data: {
            agreementId: inquiry.agreementId,
            amount: inquiry.amount,
            dueDate: inquiry.dueDate,
            status: 'PENDING',
            method,
            provider: paymentProvider,
            transactionReference: providerResult.transactionReference,
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
        transactionReference: payment.transactionReference,
        message: providerResult.message
    };
};

// ============================================
// GET PAYMENT HISTORY
// ============================================

const getPaymentHistory = async (agreementId) => {
    if (!agreementId) {
        throw new Error('Agreement ID is required');
    }

    const agreement = await prisma.rentalAgreement.findUnique({
        where: { agreementId }
    });

    if (!agreement) {
        throw new Error('Rental agreement not found');
    }

    return prisma.payment.findMany({
        where: { agreementId },
        orderBy: { dueDate: 'desc' }
    });
};

// ============================================
// GET SINGLE PAYMENT
// ============================================

const getPaymentById = async (paymentId) => {
    if (!paymentId) {
        throw new Error('Payment ID is required');
    }

    const payment = await prisma.payment.findUnique({
        where: { paymentId },
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

// ============================================
// UPDATE PAYMENT STATUS
// ============================================

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

    const allowedStatuses = ['PENDING', 'PAID', 'FAILED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
        throw new Error(`Invalid payment status: ${status}`);
    }

    const payment = await prisma.payment.findUnique({
        where: { paymentId }
    });

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.status !== 'PENDING') {
        throw new Error(`Payment cannot be changed from ${payment.status}`);
    }

    if (status === 'PAID' && !transactionReference) {
        throw new Error('Transaction reference is required when marking payment as PAID');
    }

    const updatedPayment = await prisma.payment.update({
        where: { paymentId },
        data: {
            status,
            transactionReference: transactionReference || payment.transactionReference,
            paidDate: status === 'PAID' ? new Date() : null
        }
    });

    // ✅ If payment is PAID, auto-approve the agreement
    if (status === 'PAID') {
        await autoApproveAgreementAfterPayment(payment.agreementId);
    }

    return updatedPayment;
};

// ============================================
// HANDLE MOCK PAYMENT CALLBACK
// ============================================

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
        where: { paymentId }
    });

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.status !== 'PENDING') {
        throw new Error(`Payment cannot be changed from ${payment.status}`);
    }

    if (payment.transactionReference !== transactionReference) {
        throw new Error('Transaction reference does not match payment');
    }

    const newStatus = status === 'SUCCESS' ? 'PAID' : 'FAILED';

    const updatedPayment = await prisma.payment.update({
        where: { paymentId },
        data: {
            status: newStatus,
            paidDate: status === 'SUCCESS' ? new Date() : null
        }
    });

    // ✅ If payment is SUCCESS, auto-approve the agreement
    if (status === 'SUCCESS') {
        await autoApproveAgreementAfterPayment(payment.agreementId);
    }

    return updatedPayment;
};

// ============================================
// AUTO-APPROVE AGREEMENT AFTER PAYMENT
// ============================================

const autoApproveAgreementAfterPayment = async (agreementId) => {
    try {
        console.log('=== AUTO-APPROVE AGREEMENT AFTER PAYMENT ===');
        console.log('agreementId:', agreementId);

        // Get agreement with related data
        const agreement = await prisma.rentalAgreement.findUnique({
            where: { agreementId },
            include: {
                serviceFeePayment: true,
                tenant: { include: { user: true } },
                landlord: { include: { user: true } }
            }
        });

        if (!agreement) {
            console.log('Agreement not found:', agreementId);
            return;
        }

        // ✅ Only auto-approve if status is APPROVED (waiting for final approval)
        if (agreement.status !== 'APPROVED') {
            console.log('Agreement status is not APPROVED, skipping auto-approval');
            console.log('Current status:', agreement.status);
            return;
        }

        // ✅ Check if service fee is paid
        if (!agreement.serviceFeePayment || agreement.serviceFeePayment.status !== 'PAID') {
            console.log('Service fee not paid yet, waiting for payment confirmation');
            return;
        }

        // ✅ Check if there are any PAID rent payments
        const payments = await prisma.payment.findMany({
            where: {
                agreementId: agreementId,
                status: 'PAID'
            }
        });

        if (payments.length === 0) {
            console.log('No paid rent payments found, waiting for first rent payment');
            return;
        }

        // Find the officer who created the agreement
        const officer = await prisma.officer.findUnique({
            where: { officerId: agreement.createdByOfficerId }
        });

        if (!officer) {
            console.log('Officer not found, cannot auto-approve');
            return;
        }

        // ✅ Auto-approve the agreement using the agreement service
        console.log('✅ Auto-approving agreement:', agreementId);
        
        const result = await agreementService.approveAgreement(
            agreementId,
            officer.userId,
            `Auto-approved after successful rent payment of ${payments[0].amount} ETB`
        );

        // ✅ Send SMS notifications
        await afroSMSService.sendSMS(
            agreement.tenant.user.phone,
            `SmartRent: Your rental agreement ${agreement.referenceNumber} has been approved after payment.`
        );

        await afroSMSService.sendSMS(
            agreement.landlord.user.phone,
            `SmartRent: Rental agreement ${agreement.referenceNumber} approved after tenant payment.`
        );

        console.log('✅ Agreement auto-approved:', result.referenceNumberGenerated);
        return result;

    } catch (error) {
        console.error('Auto-approve agreement error:', error);
        // Don't throw - we don't want to break the payment flow
    }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
    createPayment,
    getPaymentInquiry,
    getPaymentHistory,
    getPaymentById,
    updatePaymentStatus,
    handleMockPaymentCallback,
    getPaymentProvider,
    autoApproveAgreementAfterPayment
};