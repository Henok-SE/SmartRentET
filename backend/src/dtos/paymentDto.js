/**
 * Payment Data Transfer Objects (DTOs)
 * Sanitizes and filters sensitive internal data (national IDs, password hashes, internal DB metadata)
 */

/**
 * Mask phone number for privacy (e.g. 091***3444)
 */
function maskPhone(phone) {
    if (!phone || phone.length < 6) return phone;
    return `${phone.slice(0, 3)}***${phone.slice(-4)}`;
}

/**
 * Mask National ID for privacy (e.g. ••••••••••••5559)
 */
function maskNationalId(nationalId) {
    if (!nationalId || nationalId.length < 4) return '••••';
    return `••••••••••••${nationalId.slice(-4)}`;
}

/**
 * Transform agreement + tenant into a safe Inquiry DTO
 */
function toPaymentInquiryDTO(agreement, latestPayment = null) {
    if (!agreement) return null;

    const tenantUser = agreement.tenant?.user || {};
    const amount = Number(agreement.rentalAmount);

    let dueDate = agreement.effectiveDate;
    if (latestPayment && latestPayment.status === 'PAID') {
        dueDate = new Date(latestPayment.dueDate);
        const interval = agreement.paymentFrequency?.minimumInterval || 30;
        dueDate.setDate(dueDate.getDate() + interval);
    }

    return {
        referenceNumber: agreement.referenceNumber,
        agreementId: agreement.agreementId,
        customerName: `${tenantUser.firstName || ''} ${tenantUser.lastName || ''}`.trim() || 'Verified Tenant',
        customerPhoneNumber: tenantUser.phone || '',
        amount,
        currency: 'ETB',
        dueDate,
        description: 'Rental payment',
        propertySummary: agreement.property 
            ? `${agreement.property.address || ''}, ${agreement.property.subCity || ''}`.trim() 
            : (agreement.tenant?.address ? `${agreement.tenant.address}, ${agreement.tenant.subCity || ''}` : undefined)
    };
}

/**
 * Transform Payment database record into a safe Receipt / Status DTO
 */
function toPaymentReceiptDTO(payment) {
    if (!payment) return null;

    const agreement = payment.agreement || {};
    const tenantUser = agreement.tenant?.user || {};
    const customerName = tenantUser.firstName 
        ? `${tenantUser.firstName} ${tenantUser.lastName || ''}`.trim() 
        : (payment.customerName || 'Verified Tenant');

    return {
        paymentId: payment.paymentId,
        agreementId: payment.agreementId,
        referenceNumber: agreement.referenceNumber || payment.referenceNumber || null,
        transactionReference: payment.transactionReference || null,
        amount: Number(payment.amount),
        currency: 'ETB',
        paymentMethod: payment.method,
        provider: payment.provider,
        status: payment.status,
        dueDate: payment.dueDate,
        paidDate: payment.paidDate || null,
        notes: payment.notes || null,
        customerName,
        customerPhoneNumber: tenantUser.phone || payment.customerPhoneNumber || null,
        createdAt: payment.createdAt || payment.dueDate
    };
}

/**
 * Transform list of payments into History DTOs
 */
function toPaymentHistoryDTO(paymentList) {
    if (!Array.isArray(paymentList)) return [];
    return paymentList.map(toPaymentReceiptDTO);
}

module.exports = {
    toPaymentInquiryDTO,
    toPaymentReceiptDTO,
    toPaymentHistoryDTO,
    maskPhone,
    maskNationalId
};
