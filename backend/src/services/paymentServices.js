const prisma = require('../config/db');
const telebirrService = require('./telebirrService');
const cbeService = require('./cbeService');
const {
    NotFoundError,
    BadRequestError,
    ConflictError,
    PaymentError
} = require('../utils/errors');
const {
    toPaymentInquiryDTO,
    toPaymentReceiptDTO,
    toPaymentHistoryDTO
} = require('../dtos/paymentDto');

// Get payment provider service
const getPaymentProvider = (paymentMethod) => {
    switch (paymentMethod) {
        case 'TELEBIRR':
            return telebirrService;

        case 'CBE':
            return cbeService;

        default:
            throw new BadRequestError(`Unsupported payment method: ${paymentMethod}`);
    }
};

// Inquire rental agreement payment due details
const getPaymentInquiry = async (referenceNumber) => {
    if (!referenceNumber) {
        throw new BadRequestError('Reference number is required');
    }

    const agreement = await prisma.rentalAgreement.findUnique({
        where: {
            referenceNumber
        },
        select: {
            agreementId: true,
            referenceNumber: true,
            rentalAmount: true,
            status: true,
            effectiveDate: true,
            tenant: {
                select: {
                    address: true,
                    subCity: true,
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phone: true
                        }
                    }
                }
            },
            paymentFrequency: {
                select: {
                    name: true,
                    minimumInterval: true
                }
            }
        }
    });

    if (!agreement) {
        throw new NotFoundError(
            'Rental agreement reference not found in the official registry. Please check the reference code and try again.'
        );
    }

    if (
        agreement.status !== 'ACTIVE' &&
        agreement.status !== 'APPROVED'
    ) {
        throw new BadRequestError(
            `Payment cannot be made for agreement in ${agreement.status} status`
        );
    }

    const latestPayment = await prisma.payment.findFirst({
        where: {
            agreementId: agreement.agreementId
        },
        orderBy: {
            dueDate: 'desc'
        },
        select: {
            paymentId: true,
            dueDate: true,
            status: true
        }
    });

    if (latestPayment && latestPayment.status === 'PENDING') {
        throw new ConflictError('A payment is already pending confirmation for this agreement');
    }

    return toPaymentInquiryDTO(agreement, latestPayment);
};

// Initiate a new payment transaction
const createPayment = async ({
    referenceNumber,
    amount,
    paymentMethod,
    customerName,
    customerPhoneNumber,
    mode,
    delayMs
}) => {
    if (!referenceNumber) {
        throw new BadRequestError('Reference number is required');
    }

    if (!amount || Number(amount) <= 0) {
        throw new BadRequestError('Payment amount must be greater than zero');
    }

    if (!paymentMethod) {
        throw new BadRequestError('Payment method is required');
    }

    // Validate agreement and amount
    const inquiry = await getPaymentInquiry(referenceNumber);

    const paymentAmount = Number(amount);
    if (paymentAmount !== inquiry.amount) {
        throw new BadRequestError(
            `Payment amount must be exactly ${inquiry.amount} ETB`
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

    // Create pending payment record
    const initialPayment = await prisma.payment.create({
        data: {
            agreementId: inquiry.agreementId,
            amount: inquiry.amount,
            dueDate: inquiry.dueDate,
            status: 'PENDING',
            method,
            provider: paymentProvider,
            notes: 'Payment initiated. Awaiting provider confirmation.'
        }
    });

    console.log(`[Payment Service] Created PENDING payment record with paymentId: ${initialPayment.paymentId}`);

    // Request initiation from payment provider
    const provider = getPaymentProvider(paymentMethod);

    let providerResult;
    try {
        providerResult = await provider.initiatePayment({
            paymentId: initialPayment.paymentId,
            amount: inquiry.amount,
            customerName: customerName || inquiry.customerName,
            customerPhoneNumber: customerPhoneNumber || inquiry.customerPhoneNumber,
            referenceNumber: inquiry.referenceNumber,
            mode,
            delayMs
        });
    } catch (err) {
        // Update payment record to FAILED on provider error
        await prisma.payment.update({
            where: { paymentId: initialPayment.paymentId },
            data: {
                status: 'FAILED',
                notes: `Provider initiation failed: ${err.message}`
            }
        });
        throw new PaymentError(err.message || 'Payment provider rejected payment initiation');
    }

    if (!providerResult || !providerResult.success) {
        await prisma.payment.update({
            where: { paymentId: initialPayment.paymentId },
            data: {
                status: 'FAILED',
                notes: providerResult?.message || 'Provider initiation rejected'
            }
        });
        throw new PaymentError(
            providerResult?.message || 'Payment provider failed to initiate payment'
        );
    }

    // Update payment record with provider transaction reference
    const updatedPayment = await prisma.payment.update({
        where: {
            paymentId: initialPayment.paymentId
        },
        data: {
            transactionReference: providerResult.transactionReference,
            notes: providerResult.message
        },
        include: {
            agreement: {
                select: {
                    referenceNumber: true,
                    tenant: {
                        select: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phone: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    return toPaymentReceiptDTO(updatedPayment);
};

// Process provider webhook with transaction locking and idempotency
const handleProviderWebhook = async ({
    paymentId,
    transactionReference,
    status,
    notes,
    provider
}) => {
    if (!paymentId) {
        throw new BadRequestError('paymentId is required in webhook payload');
    }

    if (!transactionReference) {
        throw new BadRequestError('transactionReference is required in webhook payload');
    }

    const normalizedStatus = (status || '').toUpperCase();
    if (normalizedStatus !== 'SUCCESS' && normalizedStatus !== 'FAILED') {
        throw new BadRequestError('Invalid callback status: must be SUCCESS or FAILED');
    }

    // Execute in transaction to prevent race conditions
    return await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
            where: { paymentId },
            include: {
                agreement: {
                    select: {
                        referenceNumber: true,
                        tenant: {
                            select: {
                                user: {
                                    firstName: true,
                                    lastName: true,
                                    phone: true
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!payment) {
            throw new NotFoundError(`Payment record not found for paymentId: ${paymentId}`);
        }

        // Acknowledge idempotent duplicate success
        if (payment.status === 'PAID' && normalizedStatus === 'SUCCESS') {
            console.log(`[Provider Webhook] Idempotent duplicate callback acknowledged for paymentId: ${paymentId}`);
            return {
                payment: toPaymentReceiptDTO(payment),
                isDuplicate: true,
                message: 'Payment already recorded as PAID (Idempotent duplicate acknowledged)'
            };
        }

        // Acknowledge idempotent duplicate failure
        if (payment.status === 'FAILED' && normalizedStatus === 'FAILED') {
            console.log(`[Provider Webhook] Idempotent duplicate FAILED callback acknowledged for paymentId: ${paymentId}`);
            return {
                payment: toPaymentReceiptDTO(payment),
                isDuplicate: true,
                message: 'Payment already recorded as FAILED (Idempotent duplicate acknowledged)'
            };
        }

        // Reject update if payment is in terminal state
        if (payment.status !== 'PENDING') {
            throw new BadRequestError(
                `Payment is in terminal status "${payment.status}" and cannot be updated to "${normalizedStatus}"`
            );
        }

        // Update payment status and record payment date if successful
        const updatedPayment = await tx.payment.update({
            where: { paymentId },
            data: {
                status: normalizedStatus === 'SUCCESS' ? 'PAID' : 'FAILED',
                transactionReference: transactionReference || payment.transactionReference,
                paidDate: normalizedStatus === 'SUCCESS' ? new Date() : null,
                notes: notes || (normalizedStatus === 'SUCCESS' ? 'Payment confirmed by provider webhook' : 'Payment marked FAILED by provider webhook')
            },
            include: {
                agreement: {
                    select: {
                        referenceNumber: true,
                        tenant: {
                            select: {
                                user: {
                                    firstName: true,
                                    lastName: true,
                                    phone: true
                                }
                            }
                        }
                    }
                }
            }
        });

        console.log(`[Provider Webhook] Transitioned paymentId=${paymentId} from PENDING -> ${updatedPayment.status}`);

        return {
            payment: toPaymentReceiptDTO(updatedPayment),
            isDuplicate: false,
            message: `Payment status successfully updated to ${updatedPayment.status}`
        };
    }, {
        maxWait: 10000,
        timeout: 15000
    });
};

// Retrieve single payment record by ID
const getPaymentById = async (paymentId) => {
    if (!paymentId) {
        throw new BadRequestError('Payment ID is required');
    }

    const payment = await prisma.payment.findUnique({
        where: {
            paymentId
        },
        select: {
            paymentId: true,
            agreementId: true,
            amount: true,
            dueDate: true,
            paidDate: true,
            status: true,
            method: true,
            provider: true,
            transactionReference: true,
            notes: true,
            createdAt: true,
            agreement: {
                select: {
                    agreementId: true,
                    referenceNumber: true,
                    rentalAmount: true,
                    status: true,
                    tenant: {
                        select: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phone: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!payment) {
        throw new NotFoundError('Payment record not found');
    }

    return toPaymentReceiptDTO(payment);
};

// Retrieve payment history for an agreement
const getPaymentHistory = async (agreementId) => {
    if (!agreementId) {
        throw new BadRequestError('Agreement ID is required');
    }

    const agreement = await prisma.rentalAgreement.findUnique({
        where: { agreementId },
        select: { agreementId: true }
    });

    if (!agreement) {
        throw new NotFoundError('Rental agreement not found');
    }

    const payments = await prisma.payment.findMany({
        where: { agreementId },
        orderBy: { dueDate: 'desc' },
        select: {
            paymentId: true,
            agreementId: true,
            amount: true,
            dueDate: true,
            paidDate: true,
            status: true,
            method: true,
            provider: true,
            transactionReference: true,
            notes: true,
            createdAt: true
        }
    });

    return toPaymentHistoryDTO(payments);
};

// Update payment status manually
const updatePaymentStatus = async ({
    paymentId,
    status,
    transactionReference
}) => {
    if (!paymentId) {
        throw new BadRequestError('Payment ID is required');
    }

    if (!status) {
        throw new BadRequestError('Payment status is required');
    }

    const allowedStatuses = ['PENDING', 'PAID', 'FAILED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
        throw new BadRequestError(`Invalid payment status: ${status}`);
    }

    const payment = await prisma.payment.findUnique({
        where: { paymentId }
    });

    if (!payment) {
        throw new NotFoundError('Payment record not found');
    }

    if (payment.status !== 'PENDING') {
        throw new BadRequestError(`Payment cannot be changed from ${payment.status}`);
    }

    if (status === 'PAID' && !transactionReference && !payment.transactionReference) {
        throw new BadRequestError('Transaction reference is required when marking payment as PAID');
    }

    const updatedPayment = await prisma.payment.update({
        where: { paymentId },
        data: {
            status,
            transactionReference: transactionReference || payment.transactionReference,
            paidDate: status === 'PAID' ? new Date() : null
        },
        include: {
            agreement: {
                select: {
                    referenceNumber: true,
                    tenant: {
                        select: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phone: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    return toPaymentReceiptDTO(updatedPayment);
};

// Handle mock payment callback in development or test mode
const handleMockPaymentCallback = async (payload) => {
    const result = await handleProviderWebhook(payload);
    return result.payment;
};

module.exports = {
    createPayment,
    getPaymentInquiry,
    getPaymentHistory,
    getPaymentById,
    updatePaymentStatus,
    handleProviderWebhook,
    handleMockPaymentCallback,
    getPaymentProvider
};