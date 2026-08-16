const prisma = require('../config/db');
const afroSMSService = require('./afroSMSService');

const generateReferenceNumber = () => {
  const year = new Date().getFullYear();
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `RES-${year}-${String(randomStr).padStart(5, '0')}`;
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
        address: landlordAddress,
        subCity: landlordSubCity,
        houseNumber: landlordHouseNumber,
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
        location: propertyLocation,
        subCity: propertySubCity,
        woreda: propertyWoreda || null,
        houseNumber: propertyHouseNumber,
        propertyType: propertyType,
        numberOfUnits: 1,
        status: 'AVAILABLE'
      }
    });

    const unit = await tx.unit.create({
      data: {
        propertyId: property.propertyId,
        unitNumber: unitNumber,
        floor: unitFloor || 1,
        sizeSqMeters: 0,
        bedrooms: unitBedrooms || 0,
        bathrooms: unitBathrooms || 0,
        status: 'AVAILABLE',
        rentAmountFloor: monthlyRent
      }
    });

    let paymentFrequencyRecord = await tx.paymentFrequency.findUnique({
      where: { name: paymentFrequency }
    });

    if (!paymentFrequencyRecord) {
      paymentFrequencyRecord = await tx.paymentFrequency.create({
        data: {
          name: paymentFrequency,
          minimumInterval: paymentFrequency === 'MONTHLY' ? 30 : paymentFrequency === 'WEEKLY' ? 7 : 90,
          description: paymentFrequency + ' rent payments'
        }
      });
    }

    const agreement = await tx.rentalAgreement.create({
      data: {
        unitId: unit.unitId,
        landlordId: landlord.landlordId,
        tenantId: tenant.tenantId,
        paymentFrequencyId: paymentFrequencyRecord.frequencyId,
        monthlyRent: monthlyRent,
        securityDeposit: securityDeposit || null,
        effectiveDate: new Date(effectiveDate),
        status: 'PENDING'
      }
    });

    await tx.uSSDConsent.create({
      data: {
        agreementId: agreement.agreementId,
        tenantPhone: tenantUser.phone,
        landlordPhone: landlordUser.phone,
        consentType: 'INITIAL'
      }
    });

    await afroSMSService.sendUSSDConsent(tenantUser.phone, landlordUser.phone, agreement.agreementId);

    return agreement;
  });
};

const processUSSDConsent = async (agreementId, phone, response) => {
  const consent = await prisma.uSSDConsent.findUnique({ where: { agreementId } });
  if (!consent) throw new Error('Consent record not found');

  const isTenant = consent.tenantPhone === phone;
  const isLandlord = consent.landlordPhone === phone;
  if (!isTenant && !isLandlord) throw new Error('Phone not authorized');

  const isAgree = response.toUpperCase() === 'YES' || response.toUpperCase() === 'OK';

  if (!isAgree) {
    await prisma.rentalAgreement.update({ where: { agreementId }, data: { status: 'REJECTED' } });
    return { success: true, message: 'Agreement rejected by user' };
  }

  if (isTenant) {
    await prisma.uSSDConsent.update({
      where: { agreementId },
      data: { tenantConsent: true, tenantConsentDate: new Date() }
    });
  }
  if (isLandlord) {
    await prisma.uSSDConsent.update({
      where: { agreementId },
      data: { landlordConsent: true, landlordConsentDate: new Date() }
    });
  }

  const updated = await prisma.uSSDConsent.findUnique({ where: { agreementId } });

  if (updated.tenantConsent && updated.landlordConsent) {
    await prisma.rentalAgreement.update({ where: { agreementId }, data: { status: 'PENDING_PAYMENT' } });
    await afroSMSService.sendUSSD50BirrPayment(consent.landlordPhone, agreementId);

    const agreement = await prisma.rentalAgreement.findUnique({
      where: { agreementId },
      include: { landlord: true }
    });

    await prisma.governmentFeePayment.create({
      data: {
        agreementId: agreementId,
        landlordId: agreement.landlordId,
        amount: 50,
        status: 'PENDING'
      }
    });

    return { success: true, message: 'Both parties consented. Payment request sent to landlord.' };
  }

  return { success: true, message: 'Consent recorded. Waiting for other party.' };
};

const process50BirrPayment = async (agreementId, phone, pin) => {
  const consent = await prisma.uSSDConsent.findUnique({ where: { agreementId } });
  if (!consent || consent.landlordPhone !== phone) throw new Error('Phone not authorized');

  const fee = await prisma.governmentFeePayment.findUnique({ where: { agreementId } });
  if (!fee) throw new Error('Payment record not found');
  if (fee.status === 'PAID') throw new Error('Payment already completed');

  if (pin !== '1234') throw new Error('Invalid PIN. Please try again.');

  const txId = 'TXN-' + Date.now();

  await prisma.governmentFeePayment.update({
    where: { agreementId },
    data: { status: 'PAID', transactionId: txId, paymentDate: new Date() }
  });

  await prisma.rentalAgreement.update({
    where: { agreementId },
    data: { status: 'PENDING_APPROVAL' }
  });

  return {
    success: true,
    message: '50 Birr paid successfully. Waiting for officer approval.',
    transactionId: txId
  };
};

const getAgreementById = async (agreementId) => {
  return prisma.rentalAgreement.findUnique({
    where: { agreementId },
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
  processUSSDConsent,
  process50BirrPayment,
  getAgreementById,
  generateReferenceNumber
};