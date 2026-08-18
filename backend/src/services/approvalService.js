const prisma = require('../config/db');
const { generateReferenceNumber } = require('./agreementService');
const afroSMSService = require('./afroSMSService');

const approveAgreement = async (agreementId, officerUserId, comments = null) => {
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: Number(agreementId) }
    });

    if (!agreement) throw new Error('Agreement not found');

    // Only APPROVED status can be activated
    if (agreement.status !== 'APPROVED') {
      throw new Error('Agreement must be approved before activation.');
    }

    const officer = await tx.officer.findUnique({
      where: { userId: officerUserId }
    });

    if (!officer) {
      throw new Error('Officer not found');
    }

    const verifications = await tx.agreementVerification.findMany({
      where: {
        agreementId: Number(agreementId),
        status: 'VERIFIED'
      }
    });

    if (verifications.length < 2) {
      throw new Error('Both parties must verify before approval');
    }

    const serviceFee = await tx.serviceFeePayment.findUnique({
      where: { agreementId: Number(agreementId) }
    });

    if (!serviceFee || serviceFee.status !== 'PAID') {
      throw new Error('Service fee must be paid before approval');
    }

    const ref = await generateReferenceNumber();

    // Update unit status
    await tx.unit.update({
      where: { unitId: agreement.unitId },
      data: { status: 'OCCUPIED' }
    });

    // Update agreement
    const updated = await tx.rentalAgreement.update({
      where: { agreementId: Number(agreementId) },
      data: {
        status: 'ACTIVE',
        referenceNumber: ref
      }
    });

    // Create approval record
    const approval = await tx.agreementApproval.create({
      data: {
        agreementId: Number(agreementId),
        officerId: officer.officerId,
        approvalType: 'FINAL_APPROVAL',
        decision: 'APPROVED',
        comments: comments || 'Approved after verification and payment'
      }
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: officerUserId,
        action: 'APPROVE',
        entityType: 'RENTAL_AGREEMENT',
        entityId: Number(agreementId),
        description: `Approved agreement ${ref}`
      }
    });

    // Send SMS
    const landlord = await tx.landlord.findUnique({
      where: { landlordId: agreement.landlordId },
      include: { user: true }
    });

    const tenant = await tx.tenant.findUnique({
      where: { tenantId: agreement.tenantId },
      include: { user: true }
    });

    await afroSMSService.sendReferenceNumberSMS(
      tenant.user.phone,
      landlord.user.phone,
      ref
    );

    return { agreement: updated, approval, referenceNumberGenerated: ref };
  });
};

const rejectAgreement = async (agreementId, officerUserId, comments) => {
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: Number(agreementId) }
    });

    if (!agreement) throw new Error('Agreement not found');

    // Can reject if status is DRAFT, PENDING_VERIFICATION, PENDING_SERVICE_FEE, or APPROVED
    if (!['DRAFT', 'PENDING_VERIFICATION', 'PENDING_SERVICE_FEE', 'APPROVED'].includes(agreement.status)) {
      throw new Error('Agreement cannot be rejected. Current status: ' + agreement.status);
    }

    const officer = await tx.officer.findUnique({
      where: { userId: officerUserId }
    });

    if (!officer) {
      throw new Error('Officer not found');
    }

    const rejection = await tx.agreementApproval.create({
      data: {
        agreementId: Number(agreementId),
        officerId: officer.officerId,
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
        userId: officerUserId,
        action: 'REJECT',
        entityType: 'RENTAL_AGREEMENT',
        entityId: Number(agreementId),
        description: `Rejected agreement ${agreement.referenceNumber}`
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