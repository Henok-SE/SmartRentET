const prisma = require('../config/db');
const afroSMSService = require('./afroSMSService');
const bcrypt = require('bcryptjs');
const approvalService = require('./approvalService');
const { generateReferenceNumber } = require('../utils/agreementReferenceNumber');
const { agreementDTO, generateUsername, generateSecurePassword } = require('../utils/userUtils');

const MAX_VERIFICATION_ATTEMPTS = 3;
const MAX_PAYMENT_ATTEMPTS = 3;

// ============================================
// VALIDATE NATIONAL ID
// ============================================

const validateNationalId = (nationalId) => {
  if (!nationalId) return true;
  const numericRegex = /^\d{16}$/;
  return numericRegex.test(nationalId);
};

// ============================================
// GENERATE VERIFICATION CODE
// ============================================

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashCode = async (code) => {
  const saltRounds = 10;
  return bcrypt.hash(code, saltRounds);
};

// ============================================
// HELPERS
// ============================================

const checkVerificationStatus = async (phone, nationalId, role) => {
 
  const verifiedUser = await prisma.user.findFirst({
    where: {
      phone: phone,
      role: role,
      nationalId: nationalId,
      isNationalIdVerified: true
    }
  });

  if (verifiedUser) {
    return { needsVerification: false, user: verifiedUser, isNew: false };
  }

  return { needsVerification: false, user: null, isNew: false };
};

const createUserWithVerification = async (phone, firstName, lastName, nationalId, role) => {
  const username = await generateUsername(firstName, lastName);

  const user = await prisma.user.create({
    data: {
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      nationalId: nationalId || null,
      username,
      passwordHash: null,
      role: role,
      isActive: true,
      isNationalIdVerified: false
    }
  });

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.nationalIdVerification.create({
    data: {
      userId: user.userId,
      code: code,
      expiresAt: expiresAt,
      used: false
    }
  });

  console.log(`Created ${role} with verification. User ID: ${user.userId}`);
  return { user, code };
};

// ============================================
// ROLLBACK AGREEMENT
// ============================================

const rollbackAgreement = async (agreementId, reason = 'Verification failed', triggeredByUserId = null) => {
  console.log(`Rolling back agreement ${agreementId}: ${reason}`);

  return prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: agreementId }
    });

    if (!agreement) return { rolledBack: false };
    if (agreement.status === 'ACTIVE') {
      throw new Error('Cannot rollback active agreement');
    }

    const unitId = agreement.unitId;

    await tx.serviceFeePayment.deleteMany({ where: { agreementId: agreementId } });
    await tx.agreementVerification.deleteMany({ where: { agreementId: agreementId } });
    await tx.agreementApproval.deleteMany({ where: { agreementId: agreementId } });
    await tx.rentalAgreement.delete({ where: { agreementId: agreementId } });

    if (unitId) {
      const unit = await tx.unit.findUnique({ where: { unitId: unitId } });
      if (unit) {
        const propertyId = unit.propertyId;
        await tx.unit.delete({ where: { unitId: unitId } });
        const remainingUnits = await tx.unit.findMany({ where: { propertyId: propertyId } });
        if (remainingUnits.length === 0) {
          await tx.property.delete({ where: { propertyId: propertyId } });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        userId: triggeredByUserId,
        action: 'REJECT',
        entityType: 'RENTAL_AGREEMENT',
        entityId: agreementId,
        description: `ROLLBACK: agreement ${agreement.referenceNumber || agreementId} removed - Reason: ${reason}`
      }
    });

    return { rolledBack: true, reason };
  });
};

// ============================================
// CREATE AGREEMENT
// ============================================

const createAgreement = async (data, userId, officerId, officeId) => {
  console.log('=== CREATE AGREEMENT ===');

  if (!officerId) {
    throw new Error('officerId is required. Please ensure you are logged in as an Officer.');
  }

  if (!officeId) {
    throw new Error('officeId is required.');
  }

  const {
    landlordFirstName, landlordLastName, landlordPhone, landlordNationalId,
    landlordAddress, landlordSubCity, landlordWoreda, landlordHouseNumber,
    landlordBusinessLicense, landlordBankAccount,
    tenantFirstName, tenantLastName, tenantPhone, tenantNationalId,
    tenantAddress, tenantSubCity, tenantWoreda, tenantHouseNumber,
    tenantEmergencyContactName, tenantEmergencyContactPhone, tenantEmployer,
    propertyLocation, propertySubCity, propertyWoreda, propertyHouseNumber,
    propertyType, numberOfUnits,
    unitNumber, unitFloor, unitSizeSqMeters, unitBedrooms, unitBathrooms,
    unitRentAmountFloor,
    houseType, houseNumber, numberOfRooms, numberOfBathrooms,
    numberOfDoors, numberOfWindows, houseItems,
    durationValue, durationUnit, effectiveDate, terminationDate,
    rentalAmount, paymentTerms, advancePayment,
    paymentFrequencyName, notes
  } = data;

  // ============================================
  // VALIDATE NATIONAL IDs
  // ============================================

  if (landlordNationalId && !validateNationalId(landlordNationalId)) {
    throw new Error(`Landlord National ID must be exactly 16 digits.`);
  }

  if (tenantNationalId && !validateNationalId(tenantNationalId)) {
    throw new Error(`Tenant National ID must be exactly 16 digits.`);
  }

  // ============================================
  // CHECK VERIFICATION STATUS
  // ============================================

  const landlordStatus = await checkVerificationStatus(landlordPhone, landlordNationalId, 'LANDLORD');
  const tenantStatus = await checkVerificationStatus(tenantPhone, tenantNationalId, 'TENANT');

  console.log('Landlord status:', landlordStatus);
  console.log('Tenant status:', tenantStatus);

  let needsVerification = [];

  if (landlordStatus.needsVerification) {
    needsVerification.push({ party: 'Landlord', status: landlordStatus });
  }

  if (tenantStatus.needsVerification) {
    needsVerification.push({ party: 'Tenant', status: tenantStatus });
  }

  // If verification needed — create brand new users, don't create the agreement yet
  if (needsVerification.length > 0) {
    console.log('National IDs need verification:', needsVerification.map(v => v.party));

    let createdUsers = [];

    for (const item of needsVerification) {
      const { party } = item;

      const result = await createPendingPartyUser(
        party === 'Landlord' ? landlordPhone : tenantPhone,
        party === 'Landlord' ? landlordFirstName : tenantFirstName,
        party === 'Landlord' ? landlordLastName : tenantLastName,
        party === 'Landlord' ? landlordNationalId : tenantNationalId,
        party === 'Landlord' ? 'LANDLORD' : 'TENANT'
      );
      resolvedUsers.push({ party, user: result.user });
    }

    const landlordUserId = createdUsers.find(u => u.party === 'Landlord')?.user?.userId || landlordStatus.user?.userId || null;
    const tenantUserId = createdUsers.find(u => u.party === 'Tenant')?.user?.userId || tenantStatus.user?.userId || null;

    // ✅ RETURN SUCCESS with verification info (NOT error)
    return {
      requiresVerification: true,
      message: 'National ID verification required. Verification codes have been sent.',
      parties: needsVerification.map(v => v.party),
      userIds: {
        landlordUserId,
        tenantUserId
      },
      verificationSent: true
    };
  }

  // ============================================
  // ALL VERIFIED - Create agreement (WITH transaction)
  // ============================================

  console.log('All National IDs are verified! Creating agreement...');

  const txResult = await prisma.$transaction(async (tx) => {
    // Get or create Landlord user
    let landlordUser = landlordStatus.user;
    if (!landlordUser) {
      const username = await generateUsername(landlordFirstName, landlordLastName);
      landlordUser = await tx.user.create({
        data: {
          firstName: landlordFirstName,
          lastName: landlordLastName,
          phone: landlordPhone,
          nationalId: landlordNationalId || null,
          username,
          passwordHash: null,
          role: 'LANDLORD',
          isActive: true,
          isNationalIdVerified: true
        }
      });
    }

  let paymentFrequency = await prisma.paymentFrequency.findUnique({
    where: { name: paymentFrequencyName || 'MONTHLY' }
  });
  if (!paymentFrequency) {
    paymentFrequency = await prisma.paymentFrequency.create({
      data: {
        name: paymentFrequencyName || 'MONTHLY',
        minimumInterval: 30,
        description: (paymentFrequencyName || 'MONTHLY') + ' rent payments'
      }
    });
  }

  const referenceNumber = await generateReferenceNumber();
  const tenantCode = generateVerificationCode();
  const landlordCode = generateVerificationCode();
  const tenantExpiry = new Date(Date.now() + 10 * 60 * 1000);
  const landlordExpiry = new Date(Date.now() + 10 * 60 * 1000);
  const tenantCodeHash = await hashCode(tenantCode);
  const landlordCodeHash = await hashCode(landlordCode);

  const landlordUser = landlordStatus.user;
  const tenantUser = tenantStatus.user;

    // Generate reference number
    const referenceNumber = await generateReferenceNumber();

    // Create Agreement
    const agreement = await tx.rentalAgreement.create({
      data: {
        referenceNumber,
        officeId: officeId || 1,
        createdByOfficerId: officerId,
        landlordId: landlord.landlordId,
        tenantId: tenant.tenantId,
        unitId: unit.unitId,
        houseType: houseType || 'Apartment',
        houseNumber: houseNumber || 'N/A',
        numberOfRooms: numberOfRooms || 0,
        numberOfBathrooms: numberOfBathrooms || 0,
        numberOfDoors: numberOfDoors || 0,
        numberOfWindows: numberOfWindows || 0,
        houseItems: houseItems || null,
        durationValue: durationValue || 12,
        durationUnit: durationUnit || 'MONTH',
        effectiveDate: new Date(effectiveDate || Date.now()),
        terminationDate: terminationDate ? new Date(terminationDate) : null,
        rentalAmount: rentalAmount || 0,
        paymentTerms: paymentTerms || null,
        advancePayment: advancePayment || 0,
        paymentFrequencyId: paymentFrequency.frequencyId,
        status: 'PENDING_VERIFICATION',
        notes: notes || null
      },
      include: {
        landlord: { include: { user: true } },
        tenant: { include: { user: true } },
        unit: { include: { property: true } },
        paymentFrequency: true
      }
    });

    // Create verification records for USSD consent
    const tenantCode = generateVerificationCode();
    const landlordCode = generateVerificationCode();
    const tenantExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const landlordExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const tenantCodeHash = await hashCode(tenantCode);
    const landlordCodeHash = await hashCode(landlordCode);

    await tx.agreementVerification.create({
      data: {
        agreementId: agreement.agreementId,
        party: 'TENANT',
        phoneNumber: tenantUser.phone,
        codeHash: tenantCodeHash,
        expiresAt: tenantExpiry,
        status: 'PENDING'
      }
    });
  }

  let tenant = await prisma.tenant.findUnique({
    where: { userId: tenantUser.userId }
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        agreementId: agreement.agreementId,
        party: 'LANDLORD',
        phoneNumber: landlordUser.phone,
        codeHash: landlordCodeHash,
        expiresAt: landlordExpiry,
        status: 'PENDING'
      }
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: userId,
        action: 'CREATE',
        entityType: 'RENTAL_AGREEMENT',
        entityId: agreement.agreementId,
        description: `Created rental agreement ${referenceNumber} (PENDING VERIFICATION)`
      }
    });
  }

  const property = await prisma.property.create({
    data: {
      landlordId: landlord.landlordId,
      location: propertyLocation || 'Addis Ababa',
      subCity: propertySubCity || 'N/A',
      woreda: propertyWoreda || 'N/A',
      houseNumber: propertyHouseNumber || 'N/A',
      propertyType: propertyType || 'RESIDENTIAL',
      numberOfUnits: numberOfUnits || 1,
      status: 'ACTIVE',
      description: null
    }
  });

  const unit = await prisma.unit.create({
    data: {
      propertyId: property.propertyId,
      unitNumber: unitNumber || '101',
      floor: unitFloor ? Number(unitFloor) : null,
      sizeSqMeters: unitSizeSqMeters || 0,
      bedrooms: unitBedrooms ? Number(unitBedrooms) : 0,
      bathrooms: unitBathrooms ? Number(unitBathrooms) : 0,
      status: 'AVAILABLE',
      rentAmountFloor: unitRentAmountFloor || rentalAmount || 0
    }
  });

  const agreement = await prisma.rentalAgreement.create({
    data: {
      referenceNumber,
      officeId: officeId || 1,
      createdByOfficerId: officerId,
      landlordId: landlord.landlordId,
      tenantId: tenant.tenantId,
      unitId: unit.unitId,
      houseType: houseType || 'Apartment',
      houseNumber: houseNumber || 'N/A',
      numberOfRooms: numberOfRooms || 0,
      numberOfBathrooms: numberOfBathrooms || 0,
      numberOfDoors: numberOfDoors || 0,
      numberOfWindows: numberOfWindows || 0,
      houseItems: houseItems || null,
      durationValue: durationValue || 12,
      durationUnit: durationUnit || 'MONTH',
      effectiveDate: new Date(effectiveDate || Date.now()),
      terminationDate: terminationDate ? new Date(terminationDate) : null,
      rentalAmount: rentalAmount || 0,
      paymentTerms: paymentTerms || null,
      advancePayment: advancePayment || 0,
      paymentFrequencyId: paymentFrequency.frequencyId,
      status: 'PENDING_VERIFICATION',
      notes: notes || null
    },
    include: {
      landlord: { include: { user: true } },
      tenant: { include: { user: true } },
      unit: { include: { property: true } },
      paymentFrequency: true
    }
  });

  await prisma.agreementVerification.create({
    data: {
      agreementId: agreement.agreementId,
      party: 'TENANT',
      phoneNumber: tenantUser.phone,
      codeHash: tenantCodeHash,
      expiresAt: tenantExpiry,
      status: 'PENDING'
    }
  });

  await prisma.agreementVerification.create({
    data: {
      agreementId: agreement.agreementId,
      party: 'LANDLORD',
      phoneNumber: landlordUser.phone,
      codeHash: landlordCodeHash,
      expiresAt: landlordExpiry,
      status: 'PENDING'
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: userId,
      action: 'CREATE',
      entityType: 'RENTAL_AGREEMENT',
      entityId: agreement.agreementId,
      description: `Created rental agreement ${referenceNumber} (PENDING VERIFICATION)`
    }
  });

  await afroSMSService.sendUSSDConsentWithCode(
    txResult.tenantPhone,
    txResult.landlordPhone,
    txResult.agreement.agreementId,
    txResult.tenantCode,
    txResult.landlordCode,
    txResult.tenantExpiry,
    txResult.landlordExpiry
  );

  return {
    requiresVerification: false,
    agreement: agreementDTO(txResult.agreement),
    message: 'Agreement created. USSD verification codes sent to landlord and tenant.'
  };
};

// ============================================
// VERIFY AGREEMENT CODE (USSD Consent)
// ============================================

const verifyAgreementCode = async (agreementId, phone, code) => {
  console.log('=== VERIFY USSD CODE (SIGNATURE) ===');

  const verification = await prisma.agreementVerification.findFirst({
    where: {
      agreementId: agreementId,
      phoneNumber: phone,
      status: 'PENDING'
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!verification) {
    throw new Error('USSD verification code not found');
  }

  if (verification.expiresAt <= new Date()) {
    await rollbackAgreement(agreementId, 'USSD signature code expired');
    throw new Error('USSD verification code expired. Please start over.');
  }

  const isMatch = await bcrypt.compare(code, verification.codeHash);
  if (!isMatch) {
    const updated = await prisma.agreementVerification.update({
      where: { verificationId: verification.verificationId },
      data: { attempts: { increment: 1 } }
    });

    if (updated.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await rollbackAgreement(agreementId, `Too many failed USSD attempts (${updated.attempts})`);
      throw new Error('Too many failed attempts. Agreement cancelled.');
    }

    throw new Error(`Invalid code. ${MAX_VERIFICATION_ATTEMPTS - updated.attempts} attempts remaining.`);
  }

  await prisma.agreementVerification.update({
    where: { verificationId: verification.verificationId },
    data: {
      status: 'VERIFIED',
      verifiedAt: new Date()
    }
  });

  // Check if both parties verified
  const verifications = await prisma.agreementVerification.findMany({
    where: {
      agreementId: agreementId,
      status: 'VERIFIED'
    }
  });

  if (verifications.length === 2) {
    await prisma.rentalAgreement.update({
      where: { agreementId: agreementId },
      data: {
        status: 'PENDING_SERVICE_FEE',
        bothPartiesVerifiedAt: new Date()
      }
    });

    await prisma.serviceFeePayment.create({
      data: {
        agreementId: agreementId,
        amount: 50,
        status: 'PENDING',
        provider: 'TELEBIRR',
        paymentMethod: 'MOBILE_MONEY'
      }
    });

    const agreement = await prisma.rentalAgreement.findUnique({
      where: { agreementId: agreementId },
      include: { tenant: { include: { user: true } } }
    });

    await afroSMSService.sendUSSD50BirrPayment(
      agreement.tenant.user.phone,
      agreement.agreementId
    );

    return {
      success: true,
      message: 'Both parties verified. Service fee payment request sent to tenant.'
    };
  }

  return {
    success: true,
    message: 'USSD verification recorded. Waiting for other party.'
  };
};

// ============================================
// PROCESS SERVICE FEE PAYMENT
// ============================================

const processServiceFeePayment = async (agreementId, phone, pin) => {
  console.log('=== PROCESS SERVICE FEE PAYMENT ===');

  const serviceFee = await prisma.serviceFeePayment.findUnique({
    where: { agreementId: agreementId }
  });

  if (!serviceFee) {
    throw new Error('Service fee payment record not found');
  }

  if (serviceFee.status === 'PAID') {
    throw new Error('Service fee already paid');
  }

  // Mock PIN verification
  if (pin !== '1234') {
    const attempts = await prisma.auditLog.count({
      where: {
        entityType: 'SERVICE_FEE_PAYMENT',
        entityId: agreementId,
        action: 'UPDATE',
        description: { startsWith: 'Invalid PIN attempt' }
      }
    });

    const attemptCount = attempts + 1;

    await prisma.auditLog.create({
      data: {
        userId: null,
        action: 'UPDATE',
        entityType: 'SERVICE_FEE_PAYMENT',
        entityId: agreementId,
        description: `Invalid PIN attempt ${attemptCount}`
      }
    });

    if (attemptCount >= MAX_PAYMENT_ATTEMPTS) {
      await rollbackAgreement(agreementId, `Too many failed PIN attempts (${attemptCount})`);
      throw new Error('Too many failed PIN attempts. Agreement cancelled.');
    }

    throw new Error(`Invalid PIN. ${MAX_PAYMENT_ATTEMPTS - attemptCount} attempts remaining.`);
  }

  await prisma.serviceFeePayment.update({
    where: { agreementId: agreementId },
    data: {
      status: 'PAID',
      transactionReference: 'TXN-' + Date.now(),
      externalRequestId: 'REQ-' + Date.now(),
      initiatedAt: new Date(),
      paidAt: new Date()
    }
  });

  await prisma.rentalAgreement.update({
    where: { agreementId: agreementId },
    data: { status: 'APPROVED' }
  });

  return {
    success: true,
    message: '50 Birr service fee paid successfully.'
  };
};

// ============================================
// GET AGREEMENT BY ID
// ============================================

const getAgreementById = async (agreementId) => {
  console.log('=== GET AGREEMENT ===');

  const agreement = await prisma.rentalAgreement.findUnique({
    where: { agreementId: agreementId },
    include: {
      office: true,
      createdByOfficer: { include: { user: true } },
      landlord: { include: { user: true } },
      tenant: { include: { user: true } },
      unit: { include: { property: true } },
      paymentFrequency: true,
      agreementApprovals: { include: { officer: { include: { user: true } } } },
      verifications: true,
      serviceFeePayment: true,
      payments: true
    }
  });

  if (!agreement) {
    throw new Error('Rental agreement not found');
  }

  return agreementDTO(agreement);
};

// ============================================
// APPROVE AGREEMENT
// ============================================

const approveAgreement = async (agreementId, officerUserId, comments = null) => {
  console.log('=== APPROVE AGREEMENT ===');

  const txResult = await prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: agreementId }
    });

    if (!agreement) throw new Error('Agreement not found');

    if (agreement.status !== 'APPROVED') {
      throw new Error('Agreement must be in APPROVED status.');
    }

    const officer = await tx.officer.findUnique({
      where: { userId: officerUserId }
    });

    if (!officer) {
      throw new Error('Officer not found');
    }

    const verifications = await tx.agreementVerification.findMany({
      where: {
        agreementId: agreementId,
        status: 'VERIFIED'
      }
    });

    if (verifications.length < 2) {
      throw new Error('Both parties must verify before final approval');
    }

    const serviceFee = await tx.serviceFeePayment.findUnique({
      where: { agreementId: agreementId }
    });

    if (!serviceFee || serviceFee.status !== 'PAID') {
      throw new Error('Service fee must be paid before final approval');
    }

    const ref = await generateReferenceNumber();

    await tx.unit.update({
      where: { unitId: agreement.unitId },
      data: { status: 'OCCUPIED' }
    });

    const updated = await tx.rentalAgreement.update({
      where: { agreementId: agreementId },
      data: {
        status: 'ACTIVE',
        referenceNumber: ref
      }
    });

    await tx.agreementApproval.create({
      data: {
        agreementId: agreementId,
        officerId: officer.officerId,
        approvalType: 'FINAL_APPROVAL',
        decision: 'APPROVED',
        comments: comments || 'Approved after verification and payment'
      }
    });

    await tx.auditLog.create({
      data: {
        userId: officerUserId,
        action: 'APPROVE',
        entityType: 'RENTAL_AGREEMENT',
        entityId: agreementId,
        description: `Approved agreement ${ref}`
      }
    });

    const landlord = await tx.landlord.findUnique({
      where: { landlordId: agreement.landlordId },
      include: { user: true }
    });

    const tenant = await tx.tenant.findUnique({
      where: { tenantId: agreement.tenantId },
      include: { user: true }
    });

    return {
      agreement: updated,
      referenceNumberGenerated: ref,
      landlordPhone: landlord.user.phone,
      tenantPhone: tenant.user.phone
    };
  });

  await afroSMSService.sendReferenceNumberSMS(
    txResult.tenantPhone,
    txResult.landlordPhone,
    txResult.referenceNumberGenerated
  );

  return {
    agreement: agreementDTO(txResult.agreement),
    referenceNumberGenerated: txResult.referenceNumberGenerated
  };
};

// ============================================
// REJECT AGREEMENT
// ============================================

const rejectAgreement = async (agreementId, officerUserId, comments) => {
  console.log('=== REJECT AGREEMENT ===');

  const updated = await prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: agreementId }
    });

    if (!agreement) throw new Error('Agreement not found');

    if (!['DRAFT', 'PENDING_VERIFICATION', 'PENDING_SERVICE_FEE', 'APPROVED'].includes(agreement.status)) {
      throw new Error('Agreement cannot be rejected. Current status: ' + agreement.status);
    }

    const officer = await tx.officer.findUnique({
      where: { userId: officerUserId }
    });

    if (!officer) {
      throw new Error('Officer not found');
    }

    await tx.agreementApproval.create({
      data: {
        agreementId: agreementId,
        officerId: officer.officerId,
        approvalType: 'FINAL_APPROVAL',
        decision: 'REJECTED',
        comments: comments || 'Rejected by officer'
      }
    });

    const updatedAgreement = await tx.rentalAgreement.update({
      where: { agreementId: agreementId },
      data: { status: 'REJECTED' }
    });

    await tx.auditLog.create({
      data: {
        userId: officerUserId,
        action: 'REJECT',
        entityType: 'RENTAL_AGREEMENT',
        entityId: agreementId,
        description: `Rejected agreement ${agreement.referenceNumber}`
      }
    });

    return updatedAgreement;
  });

  return { agreement: agreementDTO(updated) };
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  createAgreement,
  verifyAgreementCode,
  processServiceFeePayment,
  getAgreementById,
  approveAgreement,
  rejectAgreement,
  rollbackAgreement,
  generateReferenceNumber,
  validateNationalId,
  generateVerificationCode
};