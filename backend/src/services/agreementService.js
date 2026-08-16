const prisma = require('../config/db');
const afroSMSService = require('./afroSMSService');

const generateReferenceNumber = () => {
  const year = new Date().getFullYear();
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `AGR-${year}-${String(randomStr).padStart(6, '0')}`;
};

const createAgreement = async (data) => {
  const {
    landlordFirstName,
    landlordFatherName,
    landlordGrandFatherName,
    landlordPhone,
    landlordNationalId,
    landlordAddress,
    landlordSubCity,
    landlordWoreda,
    landlordHouseNumber,
    landlordBankAccount,
    tenantFirstName,
    tenantFatherName,
    tenantGrandFatherName,
    tenantPhone,
    tenantNationalId,
    tenantAddress,
    tenantSubCity,
    tenantWoreda,
    tenantHouseNumber,
    houseType,
    houseNumber,
    numberOfRooms,
    numberOfKitchens,
    numberOfDoors,
    numberOfWindows,
    furnitureDescription,
    leaseDurationYears,
    leaseDurationMonths,
    leaseStartDate,
    leaseEndDate,
    rentAmount,
    rentCondition,
    paymentMethod,
    amountPaidAtSigning,
    effectiveDate
  } = data;

  return prisma.$transaction(async (tx) => {
    let landlordUser = await tx.user.findUnique({
      where: { nationalId: landlordNationalId }
    });

    if (!landlordUser) {
      landlordUser = await tx.user.create({
        data: {
          firstName: landlordFirstName,
          middleName: landlordFatherName,
          lastName: landlordGrandFatherName,
          phone: landlordPhone,
          nationalId: landlordNationalId,
          username: null,
          passwordHash: null,
          role: 'LANDLORD',
          isActive: true
        }
      });

      await tx.landlord.create({
        data: {
          userId: landlordUser.userId,
          address: landlordAddress || 'N/A',
          subCity: landlordSubCity || 'N/A',
          houseNumber: landlordHouseNumber || 'N/A',
          bankAccountNumber: landlordBankAccount || null
        }
      });
    }

    let tenantUser = await tx.user.findUnique({
      where: { nationalId: tenantNationalId }
    });

    if (!tenantUser) {
      tenantUser = await tx.user.create({
        data: {
          firstName: tenantFirstName,
          middleName: tenantFatherName,
          lastName: tenantGrandFatherName,
          phone: tenantPhone,
          nationalId: tenantNationalId,
          username: null,
          passwordHash: null,
          role: 'TENANT',
          isActive: true
        }
      });

      await tx.tenant.create({
        data: {
          userId: tenantUser.userId
        }
      });
    }

    const landlord = await tx.landlord.findUnique({
      where: { userId: landlordUser.userId }
    });

    const tenant = await tx.tenant.findUnique({
      where: { userId: tenantUser.userId }
    });

    const property = await tx.property.create({
      data: {
        landlordId: landlord.landlordId,
        location: landlordAddress || 'Addis Ababa',
        subCity: landlordSubCity || 'N/A',
        woreda: landlordWoreda || null,
        houseNumber: houseNumber || 'N/A',
        propertyType: houseType || 'RESIDENTIAL',
        numberOfUnits: 1,
        status: 'AVAILABLE'
      }
    });

    const unit = await tx.unit.create({
      data: {
        propertyId: property.propertyId,
        unitNumber: houseNumber || '101',
        floor: 1,
        sizeSqMeters: 0,
        bedrooms: numberOfRooms ? Number(numberOfRooms) : 0,
        bathrooms: 0,
        status: 'AVAILABLE',
        rentAmountFloor: rentAmount ? String(rentAmount) : '0'
      }
    });

    let paymentFrequencyRecord = await tx.paymentFrequency.findUnique({
      where: { name: 'MONTHLY' }
    });

    if (!paymentFrequencyRecord) {
      paymentFrequencyRecord = await tx.paymentFrequency.create({
        data: {
          name: 'MONTHLY',
          minimumInterval: 30,
          description: 'Monthly rent payments'
        }
      });
    }

    let startDate = new Date(leaseStartDate || effectiveDate || Date.now());
    let endDate = leaseEndDate ? new Date(leaseEndDate) : null;

    if (!endDate && leaseDurationYears && leaseDurationMonths) {
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + Number(leaseDurationYears));
      endDate.setMonth(endDate.getMonth() + Number(leaseDurationMonths));
    }

    const agreement = await tx.rentalAgreement.create({
      data: {
        unitId: unit.unitId,
        landlordId: landlord.landlordId,
        tenantId: tenant.tenantId,
        paymentFrequencyId: paymentFrequencyRecord.frequencyId,
        monthlyRent: String(rentAmount),
        securityDeposit: null,
        effectiveDate: new Date(effectiveDate || startDate),
        terminationDate: endDate,
        status: 'PENDING_REVIEW',
        notes: JSON.stringify({
          landlordFullName: {
            firstName: landlordFirstName,
            fatherName: landlordFatherName,
            grandFatherName: landlordGrandFatherName
          },
          tenantFullName: {
            firstName: tenantFirstName,
            fatherName: tenantFatherName,
            grandFatherName: tenantGrandFatherName
          },
          houseType: houseType || 'N/A',
          numberOfRooms: numberOfRooms || 0,
          numberOfKitchens: numberOfKitchens || 0,
          numberOfDoors: numberOfDoors || 0,
          numberOfWindows: numberOfWindows || 0,
          furnitureDescription: furnitureDescription || 'N/A',
          rentCondition: rentCondition || 'N/A',
          leaseDurationYears: leaseDurationYears || 0,
          leaseDurationMonths: leaseDurationMonths || 12,
          paymentMethod: paymentMethod || 'TELEBIRR',
          amountPaidAtSigning: amountPaidAtSigning || 0
        })
      }
    });

    const tenantCode = afroSMSService.generateVerificationCode();
    const landlordCode = afroSMSService.generateVerificationCode();
    const tenantExpiry = afroSMSService.getCodeExpiry();
    const landlordExpiry = afroSMSService.getCodeExpiry();

    await tx.uSSDConsent.create({
      data: {
        agreementId: agreement.agreementId,
        tenantPhone: tenantUser.phone,
        landlordPhone: landlordUser.phone,
        tenantVerificationCode: tenantCode,
        landlordVerificationCode: landlordCode,
        tenantCodeExpiresAt: tenantExpiry,
        landlordCodeExpiresAt: landlordExpiry,
        consentType: 'INITIAL'
      }
    });

    await afroSMSService.sendUSSDConsentWithCode(
      tenantUser.phone,
      landlordUser.phone,
      agreement.agreementId,
      tenantCode,
      landlordCode,
      tenantExpiry,
      landlordExpiry
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

  if (isTenant) {
    if (code !== consent.tenantVerificationCode) {
      throw new Error('Invalid verification code. Please check your USSD message.');
    }
    if (new Date() > consent.tenantCodeExpiresAt) {
      throw new Error('Verification code has expired. Please request a new one.');
    }
  }

  if (isLandlord) {
    if (code !== consent.landlordVerificationCode) {
      throw new Error('Invalid verification code. Please check your USSD message.');
    }
    if (new Date() > consent.landlordCodeExpiresAt) {
      throw new Error('Verification code has expired. Please request a new one.');
    }
  }

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

  const updated = await prisma.uSSDConsent.findUnique({ where: { agreementId: id } });

  if (updated.tenantConsent && updated.landlordConsent) {
    await prisma.rentalAgreement.update({
      where: { agreementId: id },
      data: { status: 'PARTIES_VERIFIED' }
    });

    await afroSMSService.sendUSSD50BirrPayment(consent.tenantPhone, id);

    const agreement = await prisma.rentalAgreement.findUnique({
      where: { agreementId: id },
      include: { landlord: true, tenant: true }
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
      message: 'Both parties verified. Payment request sent to tenant.'
    };
  }

  return {
    success: true,
    message: 'Verification recorded. Waiting for other party.'
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
    data: { status: 'SERVICE_FEE_PENDING' }
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
  generateReferenceNumber
};