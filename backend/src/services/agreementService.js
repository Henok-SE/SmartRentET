const prisma = require('../config/database');

const createAgreement = async (data) => {
  const {
    unitId,
    landlordId,
    tenantId,
    paymentFrequencyId,
    monthlyRent,
    securityDeposit,
    effectiveDate,
    terminationDate,
    renewalDate,
    notes
  } = data;

  const landlord = await prisma.landlord.findUnique({
    where: { landlordId }
  });
  if (!landlord) {
    throw new Error('Invalid landlord: Landlord does not exist');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { tenantId }
  });
  if (!tenant) {
    throw new Error('Invalid tenant: Tenant does not exist');
  }

  const unit = await prisma.unit.findUnique({
    where: { unitId },
    include: { property: true }
  });
  if (!unit) {
    throw new Error('Invalid unit: Unit does not exist');
  }

  if (unit.property.landlordId !== landlordId) {
    throw new Error('Unit does not belong to the specified landlord');
  }

  if (unit.status !== 'AVAILABLE') {
    throw new Error('Unit is not available. Current status: ' + unit.status);
  }

  const paymentFrequency = await prisma.paymentFrequency.findUnique({
    where: { frequencyId: paymentFrequencyId }
  });
  if (!paymentFrequency) {
    throw new Error('Invalid payment frequency');
  }

  if (monthlyRent <= 0) {
    throw new Error('Rent amount must be greater than 0');
  }

  const effective = new Date(effectiveDate);
  if (isNaN(effective.getTime())) {
    throw new Error('Invalid effective date');
  }

  if (terminationDate) {
    const termination = new Date(terminationDate);
    if (isNaN(termination.getTime())) {
      throw new Error('Invalid termination date');
    }
    if (termination <= effective) {
      throw new Error('Termination date must be after effective date');
    }
  }

  const existingActive = await prisma.rentalAgreement.findFirst({
    where: {
      unitId: unitId,
      status: {
        in: ['DRAFT', 'PENDING_REVIEW', 'ACTIVE']
      }
    }
  });

  if (existingActive) {
    throw new Error('Unit already has an active or pending agreement');
  }

  const agreement = await prisma.rentalAgreement.create({
    data: {
      unitId,
      landlordId,
      tenantId,
      paymentFrequencyId,
      monthlyRent,
      securityDeposit: securityDeposit || null,
      effectiveDate: effective,
      terminationDate: terminationDate ? new Date(terminationDate) : null,
      renewalDate: renewalDate ? new Date(renewalDate) : null,
      notes: notes || null,
      status: 'DRAFT'
    },
    include: {
      unit: {
        include: { property: true }
      },
      landlord: {
        include: { user: true }
      },
      tenant: {
        include: { user: true }
      },
      paymentFrequency: true
    }
  });

  return agreement;
};

const getAgreementById = async (agreementId) => {
  return prisma.rentalAgreement.findUnique({
    where: { agreementId },
    include: {
      unit: {
        include: { property: true }
      },
      landlord: {
        include: { user: true }
      },
      tenant: {
        include: { user: true }
      },
      paymentFrequency: true,
      agreementApprovals: {
        include: {
          officer: {
            include: { user: true }
          }
        },
        orderBy: { approvalDate: 'asc' }
      }
    }
  });
};

const canApprove = (agreement) => {
  return agreement && ['DRAFT', 'PENDING_REVIEW'].includes(agreement.status);
};

const isFinalized = (agreement) => {
  return agreement && ['APPROVED', 'ACTIVE', 'REJECTED', 'TERMINATED', 'EXPIRED'].includes(agreement.status);
};

module.exports = {
  createAgreement,
  getAgreementById,
  canApprove,
  isFinalized
};