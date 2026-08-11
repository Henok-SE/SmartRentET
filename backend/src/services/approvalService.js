const prisma = require('../config/database');
const referenceNumberService = require('./referenceNumberService');
const { canApprove } = require('./agreementService');

const approveAgreement = async (agreementId, officerId, comments = null) => {
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId }
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (!canApprove(agreement)) {
      throw new Error('Agreement cannot be approved. Current status: ' + agreement.status);
    }

    const officer = await tx.officer.findUnique({
      where: { officerId }
    });
    if (!officer) {
      throw new Error('Officer not found');
    }

    const approvalCount = await tx.agreementApproval.count({
      where: { agreementId }
    });

    const isFinalApproval = approvalCount >= 1;
    const approvalType = isFinalApproval ? 'FINAL_APPROVAL' : 'REVIEW';

    const approval = await tx.agreementApproval.create({
      data: {
        agreementId,
        officerId,
        approvalType,
        decision: 'APPROVED',
        comments: comments || null
      }
    });

    let newStatus = 'PENDING_REVIEW';
    let referenceNumber = null;

    if (isFinalApproval) {
      newStatus = 'ACTIVE';
      referenceNumber = await referenceNumberService.generateReferenceNumber('RES');

      await tx.unit.update({
        where: { unitId: agreement.unitId },
        data: { status: 'OCCUPIED' }
      });
    } else {
      newStatus = 'PENDING_REVIEW';
    }

    const updatedAgreement = await tx.rentalAgreement.update({
      where: { agreementId },
      data: {
        status: newStatus,
        referenceNumber: referenceNumber
      }
    });

    return {
      agreement: updatedAgreement,
      approval: approval,
      isFinalApproval: isFinalApproval,
      referenceNumberGenerated: referenceNumber
    };
  });
};

const rejectAgreement = async (agreementId, officerId, comments) => {
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId }
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (!canApprove(agreement)) {
      throw new Error('Agreement cannot be rejected. Current status: ' + agreement.status);
    }

    const officer = await tx.officer.findUnique({
      where: { officerId }
    });
    if (!officer) {
      throw new Error('Officer not found');
    }

    const approvalCount = await tx.agreementApproval.count({
      where: { agreementId }
    });
    const approvalType = approvalCount >= 1 ? 'FINAL_APPROVAL' : 'REVIEW';

    const rejection = await tx.agreementApproval.create({
      data: {
        agreementId,
        officerId,
        approvalType,
        decision: 'REJECTED',
        comments: comments || 'Rejected by officer'
      }
    });

    const updatedAgreement = await tx.rentalAgreement.update({
      where: { agreementId },
      data: {
        status: 'REJECTED'
      }
    });

    return {
      agreement: updatedAgreement,
      rejection: rejection
    };
  });
};

const getApprovalHistory = async (agreementId) => {
  return prisma.agreementApproval.findMany({
    where: { agreementId },
    include: {
      officer: {
        include: { user: true }
      }
    },
    orderBy: { approvalDate: 'asc' }
  });
};

module.exports = {
  approveAgreement,
  rejectAgreement,
  getApprovalHistory
};