const prisma = require('../config/db');
const { generateReferenceNumber } = require('./agreementService');
const afroSMSService = require('./afroSMSService');

const approveAgreement = async (agreementId, officerId, comments = null) => {
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: Number(agreementId) }
    });
    if (!agreement) throw new Error('Agreement not found');
    if (agreement.status !== 'PENDING_APPROVAL') {
      throw new Error('Agreement cannot be approved. Current status: ' + agreement.status);
    }

    const consent = await tx.uSSDConsent.findUnique({ where: { agreementId } });
    if (!consent || !consent.tenantConsent || !consent.landlordConsent) {
      throw new Error('Both parties must consent before approval');
    }

    const fee = await tx.governmentFeePayment.findUnique({ where: { agreementId } });
    if (!fee || fee.status !== 'PAID') {
      throw new Error('50 Birr government fee must be paid before approval');
    }

    const ref = generateReferenceNumber();

    await tx.unit.update({
      where: { unitId: agreement.unitId },
      data: { status: 'OCCUPIED' }
    });

    const updated = await tx.rentalAgreement.update({
      where: { agreementId: Number(agreementId) },
      data: { status: 'ACTIVE', referenceNumber: ref }
    });

    const approval = await tx.agreementApproval.create({
      data: {
        agreementId: Number(agreementId),
        officerId: officerId,
        approvalType: 'FINAL_APPROVAL',
        decision: 'APPROVED',
        comments: comments || 'Approved after consents and payment'
      }
    });

    await tx.auditLog.create({
      data: {
        userId: officerId,
        actionType: 'APPROVE',
        entityType: 'AGREEMENT',
        entityId: Number(agreementId),
        newValues: { status: 'ACTIVE', referenceNumber: ref }
      }
    });

    const consentData = await tx.uSSDConsent.findUnique({ where: { agreementId } });
    await afroSMSService.sendReferenceNumberSMS(
      consentData.tenantPhone,
      consentData.landlordPhone,
      ref
    );

    return { agreement: updated, approval, referenceNumberGenerated: ref };
  });
};

const rejectAgreement = async (agreementId, officerId, comments) => {
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: Number(agreementId) }
    });
    if (!agreement) throw new Error('Agreement not found');
    if (agreement.status !== 'PENDING_APPROVAL') {
      throw new Error('Agreement cannot be rejected. Current status: ' + agreement.status);
    }

    const rejection = await tx.agreementApproval.create({
      data: {
        agreementId: Number(agreementId),
        officerId: officerId,
        approvalType: 'FINAL_APPROVAL',
        decision: 'REJECTED',
        comments: comments || 'Rejected by officer'
      }
    });

    const updated = await tx.rentalAgreement.update({
      where: { agreementId: Number(agreementId) },
      data: { status: 'REJECTED' }
    });

    await tx.auditLog.create({
      data: {
        userId: officerId,
        actionType: 'REJECT',
        entityType: 'AGREEMENT',
        entityId: Number(agreementId),
        newValues: { status: 'REJECTED' }
      }
    });

    return { agreement: updated, rejection };
  });
};

const getApprovalHistory = async (agreementId) => {
  return prisma.agreementApproval.findMany({
    where: { agreementId: Number(agreementId) },
    include: { officer: { include: { user: true } } },
    orderBy: { approvalDate: 'asc' }
  });
};

module.exports = {
  approveAgreement,
  rejectAgreement,
  getApprovalHistory
};