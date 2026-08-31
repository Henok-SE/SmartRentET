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

/**
 * 1. Inquire Rental Agreement payment due information
 * Optimized with targeted Prisma select projections & DTO filtering
 */
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

/**
 * 2. Initiate Payment
 * Creates PENDING record in DB -> Invokes Provider Simulator -> Updates Transaction Reference
 */
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

    // Step 1: Inquire and validate against real agreement
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

    // Step 2: Create initial Payment record in DB in PENDING status atomically
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

    // Step 3: Call Provider Layer / Simulator passing generated paymentId
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
        // Mark payment as FAILED if simulator/provider rejected
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

    // Step 4: Update Payment record with returned transaction reference
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

/**
 * 3. Handle Provider Webhook
 * The authoritative payment status transition mechanism
 * Atomic execution with Prisma Interactive Transaction & Idempotency support
 */
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

    // Execute atomic transaction for find-and-update to prevent race conditions
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
            throw new NotFoundError(`Payment record not found for paymentId: ${paymentId}`);
        }

        // Idempotency: If already PAID and duplicate SUCCESS arrives
        if (payment.status === 'PAID' && normalizedStatus === 'SUCCESS') {
            console.log(`[Provider Webhook] Idempotent duplicate callback acknowledged for paymentId: ${paymentId}`);
            return {
                payment: toPaymentReceiptDTO(payment),
                isDuplicate: true,
                message: 'Payment already recorded as PAID (Idempotent duplicate acknowledged)'
            };
        }

        // Idempotency: If already FAILED and duplicate FAILED arrives
        if (payment.status === 'FAILED' && normalizedStatus === 'FAILED') {
            console.log(`[Provider Webhook] Idempotent duplicate FAILED callback acknowledged for paymentId: ${paymentId}`);
            return {
                payment: toPaymentReceiptDTO(payment),
                isDuplicate: true,
                message: 'Payment already recorded as FAILED (Idempotent duplicate acknowledged)'
            };
        }

        // Terminal state check
        if (payment.status !== 'PENDING') {
            throw new BadRequestError(
                `Payment is in terminal status "${payment.status}" and cannot be updated to "${normalizedStatus}"`
            );
        }

        // Update payment state
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

/**
 * 4. Get Single Payment by ID (Optimized DTO)
 */
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

/**
 * 5. Get Payment History by Agreement ID
 */
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

/**
 * 6. Update Payment Status (Admin Manual Adjustment)
 */
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

/**
 * Legacy mock payment callback (Development/Testing only)
 */
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