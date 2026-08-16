const prisma = require('../config/db');

/**
 * Generate a unique contract reference number
 */
const generateReferenceNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `SRET-${new Date().getFullYear()}-${timestamp}${randomStr}`;
};

/**
 * Create a new rental agreement
 */
const createAgreement = async (data, userId) => {
  const {
    unitId,
    landlordId,
    tenantId,
    paymentFrequencyId,
    monthlyRent,
    securityDeposit,
    effectiveDate,
    terminationDate,
    notes
  } = data;

  if (!unitId || !landlordId || !tenantId || !paymentFrequencyId || !monthlyRent || !effectiveDate) {
    throw new Error('Required fields missing: unitId, landlordId, tenantId, paymentFrequencyId, monthlyRent, effectiveDate');
  }

  const referenceNumber = generateReferenceNumber();

  const agreement = await prisma.rentalAgreement.create({
    data: {
      referenceNumber,
      unitId: Number(unitId),
      landlordId: Number(landlordId),
      tenantId: Number(tenantId),
      paymentFrequencyId: Number(paymentFrequencyId),
      monthlyRent: String(monthlyRent),
      securityDeposit: securityDeposit ? String(securityDeposit) : null,
      status: 'PENDING_REVIEW',
      effectiveDate: new Date(effectiveDate),
      terminationDate: terminationDate ? new Date(terminationDate) : null,
      notes: notes || null
    },
    include: {
      unit: true,
      landlord: { include: { user: true } },
      tenant: { include: { user: true } }
    }
  });

  return agreement;
};

/**
 * Get all agreements (filtered by role / user)
 */
const getAgreements = async (user) => {
  const { userId, role } = user;

  let whereClause = {};

  if (role === 'LANDLORD') {
    const landlord = await prisma.landlord.findUnique({ where: { userId } });
    if (!landlord) return [];
    whereClause.landlordId = landlord.landlordId;
  } else if (role === 'TENANT') {
    const tenant = await prisma.tenant.findUnique({ where: { userId } });
    if (!tenant) return [];
    whereClause.tenantId = tenant.tenantId;
  }
  // OFFICER and ADMIN see all agreements by default

  return await prisma.rentalAgreement.findMany({
    where: whereClause,
    include: {
      unit: true,
      landlord: { include: { user: true } },
      tenant: { include: { user: true } },
      agreementApprovals: { include: { officer: { include: { user: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Get agreement by ID
 */
const getAgreementById = async (agreementId) => {
  const agreement = await prisma.rentalAgreement.findUnique({
    where: { agreementId: Number(agreementId) },
    include: {
      unit: true,
      landlord: { include: { user: true } },
      tenant: { include: { user: true } },
      agreementApprovals: { include: { officer: { include: { user: true } } } }
    }
  });

  if (!agreement) {
    throw new Error('Rental agreement not found');
  }

  return agreement;
};

/**
 * Approve or Reject an agreement (Officer Action)
 */
const processApproval = async (agreementId, officerUserId, approvalType, decision, comments) => {
  const officer = await prisma.officer.findUnique({ where: { userId: officerUserId } });
  if (!officer) {
    throw new Error('Officer profile not found for current user');
  }

  const agreement = await prisma.rentalAgreement.findUnique({
    where: { agreementId: Number(agreementId) }
  });

  if (!agreement) {
    throw new Error('Rental agreement not found');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Record approval log
    const approval = await tx.agreementApproval.create({
      data: {
        agreementId: Number(agreementId),
        officerId: officer.officerId,
        approvalType: approvalType || 'REVIEW',
        decision: decision.toUpperCase(),
        comments: comments || null
      }
    });

    // 2. Update agreement status based on decision
    const newStatus = decision.toUpperCase() === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    await tx.rentalAgreement.update({
      where: { agreementId: Number(agreementId) },
      data: { status: newStatus }
    });

    return approval;
  });
};

module.exports = {
  createAgreement,
  getAgreements,
  getAgreementById,
  processApproval
};