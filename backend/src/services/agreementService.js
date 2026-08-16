const prisma = require('../config/db');
const afroSMSService = require('./afroSMSService');

const generateReferenceNumber = () => {
  const year = new Date().getFullYear();
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `RES-${year}-${String(randomStr).padStart(5, '0')}`;
};

const generateVerificationCode = () => {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `${part1}-${part2}`;
};

const createAgreement = async (data) => {
  const {
    landlordFirstName, landlordMiddleName, landlordLastName,
    landlordPhone, landlordNationalId, landlordFinNumber,
    landlordAddress, landlordSubCity, landlordHouseNumber, landlordBankAccount,
    tenantFirstName, tenantMiddleName, tenantLastName,
    tenantPhone, tenantNationalId,
    propertyLocation, propertySubCity, propertyWoreda,
    propertyHouseNumber, propertyType,
    unitNumber, unitFloor, unitBedrooms, unitBathrooms,
    monthlyRent, securityDeposit, effectiveDate, paymentFrequency
  } = data;

  return prisma.$transaction(async (tx) => {
    const landlordUser = await tx.user.create({
      data: {
        firstName: landlordFirstName,
        middleName: landlordMiddleName || null,
        lastName: landlordLastName,
        phone: landlordPhone,
        nationalId: landlordNationalId,
        finNumber: landlordFinNumber || null,
        username: null,
        passwordHash: null,
        role: 'LANDLORD',
        isActive: true
      }
    });

    const landlord = await tx.landlord.create({
      data: {
        userId: landlordUser.userId,
        address: landlordAddress || 'N/A',
        houseNumber: landlordHouseNumber || 'N/A',
        bankAccountNumber: landlordBankAccount || null
      }
    });

    const tenantUser = await tx.user.create({
      data: {
        firstName: tenantFirstName,
        middleName: tenantMiddleName || null,
        lastName: tenantLastName,
        phone: tenantPhone,
        nationalId: tenantNationalId,
        username: null,
        passwordHash: null,
        role: 'TENANT',
        isActive: true
      }
    });

    const tenant = await tx.tenant.create({
      data: { userId: tenantUser.userId }
    });

    const property = await tx.property.create({
      data: {
        landlordId: landlord.landlordId,
        location: propertyLocation || 'Addis Ababa',
        subCity: propertySubCity || 'N/A',
        woreda: propertyWoreda || null,
        houseNumber: propertyHouseNumber || 'N/A',
        propertyType: propertyType || 'RESIDENTIAL',
        numberOfUnits: 1,
        status: 'AVAILABLE'
      }
    });

    const unit = await tx.unit.create({
      data: {
        propertyId: property.propertyId,
        unitNumber: unitNumber || '101',
        floor: unitFloor ? Number(unitFloor) : 1,
        sizeSqMeters: 0,
        bedrooms: unitBedrooms ? Number(unitBedrooms) : 0,
        bathrooms: unitBathrooms ? Number(unitBathrooms) : 0,
        status: 'AVAILABLE',
        rentAmountFloor: monthlyRent ? String(monthlyRent) : '0'
      }
    });

    let paymentFrequencyRecord = await tx.paymentFrequency.findUnique({
      where: { name: paymentFrequency || 'MONTHLY' }
    });

    if (!paymentFrequencyRecord) {
      paymentFrequencyRecord = await tx.paymentFrequency.create({
        data: {
          name: paymentFrequency || 'MONTHLY',
          minimumInterval: (paymentFrequency === 'MONTHLY' || !paymentFrequency) ? 30 : paymentFrequency === 'WEEKLY' ? 7 : 90,
          description: (paymentFrequency || 'MONTHLY') + ' rent payments'
        }
      });
    }

    const agreement = await tx.rentalAgreement.create({
      data: {
        unitId: unit.unitId,
        landlordId: landlord.landlordId,
        tenantId: tenant.tenantId,
        paymentFrequencyId: paymentFrequencyRecord.frequencyId,
        monthlyRent: String(monthlyRent),
        securityDeposit: securityDeposit ? String(securityDeposit) : null,
        effectiveDate: new Date(effectiveDate || Date.now()),
        status: 'DRAFT'
      }
    });

    // Generate unique verification codes for each party
    const tenantCode = generateVerificationCode();
    const landlordCode = generateVerificationCode();

    // Create USSD Consent record with verification codes
    await tx.uSSDConsent.create({
      data: {
        agreementId: agreement.agreementId,
        tenantPhone: tenantUser.phone,
        landlordPhone: landlordUser.phone,
        tenantVerificationCode: tenantCode,
        landlordVerificationCode: landlordCode,
        consentType: 'INITIAL'
      }
    });

    // Send USSD with verification codes
    await afroSMSService.sendUSSDConsentWithCode(
      tenantUser.phone,
      landlordUser.phone,
      agreement.agreementId,
      tenantCode,
      landlordCode
    );

    return agreement;
  });
};

const processUSSDVerification = async (agreementId, phone, code) => {
  const id = Number(agreementId);
  const consent = await prisma.uSSDConsent.findUnique({ where: { agreementId: id } });
  if (!consent) throw new Error('Consent record not found');

  const isTenant = consent.tenantPhone === phone;
  const isLandlord = consent.landlordPhone === phone;
  if (!isTenant && !isLandlord) throw new Error('Phone not authorized for this agreement');

  if (isTenant && consent.tenantConsent) {
    throw new Error('You have already signed this agreement');
  }
  if (isLandlord && consent.landlordConsent) {
    throw new Error('You have already signed this agreement');
  }

  // Verify the code
  if (isTenant && code !== consent.tenantVerificationCode) {
    throw new Error('Invalid verification code. Please check your USSD message.');
  }
  if (isLandlord && code !== consent.landlordVerificationCode) {
    throw new Error('Invalid verification code. Please check your USSD message.');
  }

  // Record consent
  if (isTenant) {
    await prisma.uSSDConsent.update({
      where: { agreementId: id },
      data: {
        tenantConsent: true,
        tenantConsentDate: new Date()
      }
    });
  }
  if (isLandlord) {
    await prisma.uSSDConsent.update({
      where: { agreementId: id },
      data: {
        landlordConsent: true,
        landlordConsentDate: new Date()
      }
    });
  }

  // Check if both have consented
  const updated = await prisma.uSSDConsent.findUnique({ where: { agreementId: id } });

  if (updated.tenantConsent && updated.landlordConsent) {
    await prisma.rentalAgreement.update({
      where: { agreementId: id },
      data: { status: 'PENDING_PAYMENT' }
    });

    // Send 50 Birr payment request to TENANT
    await afroSMSService.sendUSSD50BirrPayment(consent.tenantPhone, id);

    const agreement = await prisma.rentalAgreement.findUnique({
      where: { agreementId: id },
      include: { landlord: true }
    });

    await prisma.governmentFeePayment.create({
      data: {
        agreementId: id,
        landlordId: agreement.landlordId,
        tenantId: agreement.tenantId,
        amount: 50,
        status: 'PENDING'
      }
    });

    return {
      success: true,
      message: 'Both parties signed. Payment request sent to tenant.'
    };
  }

  return {
    success: true,
    message: 'Signature recorded. Waiting for other party.'
  };
};

const process50BirrPayment = async (agreementId, phone, pin) => {
  const id = Number(agreementId);
  const consent = await prisma.uSSDConsent.findUnique({ where: { agreementId: id } });
  if (!consent || consent.tenantPhone !== phone) throw new Error('Phone not authorized');

  const fee = await prisma.governmentFeePayment.findUnique({ where: { agreementId: id } });
  if (!fee) throw new Error('Payment record not found');
  if (fee.status === 'PAID') throw new Error('Payment already completed');

  if (pin !== '1234') throw new Error('Invalid PIN. Please try again.');

  const txId = 'TXN-' + Date.now();

  await prisma.governmentFeePayment.update({
    where: { agreementId: id },
    data: { status: 'PAID', transactionId: txId, paymentDate: new Date() }
  });

  await prisma.rentalAgreement.update({
    where: { agreementId: id },
    data: { status: 'PENDING_APPROVAL' }
  });

  return {
    success: true,
    message: '50 Birr paid successfully by tenant. Waiting for officer approval.',
    transactionId: txId
  };
};

const getAgreementById = async (agreementId) => {
  const id = Number(agreementId);
  const agreement = await prisma.rentalAgreement.findUnique({
    where: { agreementId: id },
    include: {
      unit: { include: { property: true } },
      landlord: { include: { user: true } },
      tenant: { include: { user: true } },
      paymentFrequency: true,
      agreementApprovals: { include: { officer: { include: { user: true } } } },
      ussdConsent: true,
      feePayment: true
    }
  });
  if (!agreement) throw new Error('Rental agreement not found');
  return agreement;
};

module.exports = {
  createAgreement,
  processUSSDVerification,
  process50BirrPayment,
  getAgreementById,
  generateReferenceNumber,
  generateVerificationCode
};