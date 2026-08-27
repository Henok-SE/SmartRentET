const prisma = require('../config/db');
const afroSMSService = require('./afroSMSService');
const bcrypt = require('bcryptjs');

// Max failed attempts before an agreement is automatically rolled back
const MAX_VERIFICATION_ATTEMPTS = 3;
const MAX_PAYMENT_ATTEMPTS = 3;

// ============================================
// VALIDATE NATIONAL ID - Must be exactly 16 digits
// ============================================
const validateNationalId = (nationalId) => {
  if (!nationalId) return true;
  const numericRegex = /^\d{16}$/;
  return numericRegex.test(nationalId);
};

// ============================================
// VERIFY NATIONAL ID UNIQUENESS
// ============================================

const verifyNationalId = async (nationalId, phone = null, role = null, excludeUserId = null) => {
  if (!nationalId) return true;

  const existingUser = await prisma.user.findFirst({
    where: {
      nationalId: nationalId,
      ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {})
    }
  });

  if (!existingUser) return true;

  if (phone && role && existingUser.phone === phone && existingUser.role === role) {
    return true;
  }

  return false;
};

// ============================================
// GENERATE UNIQUE REFERENCE NUMBER
// ============================================
const generateReferenceNumber = async () => {
  const year = new Date().getFullYear();
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  let referenceNumber = `AGR-${year}-${randomPart}`;
  
  try {
    const exists = await prisma.rentalAgreement.findUnique({
      where: { referenceNumber: referenceNumber }
    });
    
    let attempts = 0;
    while (exists && attempts < 10) {
      randomPart = '';
      for (let i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      referenceNumber = `AGR-${year}-${randomPart}`;
      const checkExists = await prisma.rentalAgreement.findUnique({
        where: { referenceNumber: referenceNumber }
      });
      if (!checkExists) break;
      attempts++;
    }
  } catch (error) {
    console.log('Reference number check skipped - using generated number');
  }
  
  console.log('Generated reference number:', referenceNumber);
  return referenceNumber;
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashCode = async (code) => {
  const saltRounds = 10;
  return bcrypt.hash(code, saltRounds);
};

// ============================================
// STEP 1: CREATE OR FIND USER WITH VERIFICATION
// ============================================
const createUserWithVerification = async (phone, firstName, lastName, nationalId, role) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        nationalId: nationalId,
        username: null,
        passwordHash: null,
        role: role,
        isActive: true,
        isNationalIdVerified: false
      }
    });
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await tx.nationalIdVerification.create({
      data: {
        userId: user.userId,
        code: code,
        expiresAt: expiresAt,
        used: false
      }
    });

    console.log(`\n📋 ${role} National ID verification required.`);
    console.log(`   User ID: ${user.userId}`);
    console.log(`   (Request the verification code separately using this User ID)\n`);

    return { user, code };
  }, {
    timeout: 1800000
  });
};

const getNationalIdVerificationCode = async (userId) => {
  const verification = await prisma.nationalIdVerification.findFirst({
    where: {
      userId: userId,
      used: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!verification) {
    throw new Error('No active verification code found for this User ID. It may be expired or already used - request a resend.');
  }

  console.log(`\n📋 Verification code requested for User ID: ${userId}`);
  console.log(`   Code: ${verification.code}\n`);

  return {
    userId: userId,
    code: verification.code,
    expiresAt: verification.expiresAt
  };
};

// ============================================
// STEP 2: VERIFY NATIONAL ID
// ============================================
const verifyNationalIdWithCode = async (userId, code) => {
  const verification = await prisma.nationalIdVerification.findFirst({
    where: {
      userId: userId,
      code: code,
      used: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!verification) {
    throw new Error('Invalid or expired verification code');
  }

  await prisma.$transaction(async (tx) => {
    await tx.nationalIdVerification.update({
      where: { verificationId: verification.verificationId },
      data: { used: true }
    });

    await tx.user.update({
      where: { userId: userId },
      data: { isNationalIdVerified: true }
    });
  }, {
    timeout: 1800000
  });

  console.log('✅ National ID verified for user:', userId);
  return { success: true, message: 'National ID verified successfully' };
};

// ============================================
// STEP 3: CHECK VERIFICATION STATUS
// ============================================
const checkVerificationStatus = async (phone, nationalId, role) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      phone: phone,
      role: role
    }
  });

  if (existingUser) {
    if (existingUser.nationalId && !existingUser.isNationalIdVerified) {
      return { needsVerification: true, user: existingUser, isNew: false };
    }
    return { needsVerification: false, user: existingUser, isNew: false };
  } else if (nationalId) {
    return { needsVerification: true, user: null, isNew: true };
  }
  
  return { needsVerification: false, user: null, isNew: false };
};

// ============================================
// STEP 4: CREATE AGREEMENT - FIRST CALL (CHECK NATIONAL ID)
// ============================================
const createAgreement = async (data, userId, officerId, officeId) => {
  console.log('=== AGREEMENT SERVICE ===');
  console.log('userId:', userId);
  console.log('officerId:', officerId);
  console.log('officeId:', officeId);
  console.log('data received:', Object.keys(data));

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
    paymentFrequencyName,
    notes
  } = data;

  // ============================================
  // STEP 1: Validate National IDs format and uniqueness
  // ============================================
  if (landlordNationalId) {
    if (!validateNationalId(landlordNationalId)) {
      throw new Error(`Landlord National ID must be exactly 16 digits.`);
    }
    const isUnique = await verifyNationalId(landlordNationalId, landlordPhone, 'LANDLORD');
    if (!isUnique) {
      throw new Error(`Landlord National ID ${landlordNationalId} is already registered in the system.`);
    }
  }

  if (tenantNationalId) {
    if (!validateNationalId(tenantNationalId)) {
      throw new Error(`Tenant National ID must be exactly 16 digits.`);
    }
    const isUnique = await verifyNationalId(tenantNationalId, tenantPhone, 'TENANT');
    if (!isUnique) {
      throw new Error(`Tenant National ID ${tenantNationalId} is already registered in the system.`);
    }
  }

  // ============================================
  // STEP 2: Check verification status for both parties
  // ============================================
  const landlordStatus = await checkVerificationStatus(landlordPhone, landlordNationalId, 'LANDLORD');
  const tenantStatus = await checkVerificationStatus(tenantPhone, tenantNationalId, 'TENANT');

  console.log('Landlord status:', {
    needsVerification: landlordStatus.needsVerification,
    isNew: landlordStatus.isNew,
    userId: landlordStatus.user?.userId || null,
    phone: landlordStatus.user?.phone || null,
    nationalId: landlordStatus.user?.nationalId || null,
    isNationalIdVerified: landlordStatus.user?.isNationalIdVerified ?? null
  });
  console.log('Tenant status:', {
    needsVerification: tenantStatus.needsVerification,
    isNew: tenantStatus.isNew,
    userId: tenantStatus.user?.userId || null,
    phone: tenantStatus.user?.phone || null,
    nationalId: tenantStatus.user?.nationalId || null,
    isNationalIdVerified: tenantStatus.user?.isNationalIdVerified ?? null
  });

  let needsVerification = [];

  if (landlordStatus.needsVerification) {
    needsVerification.push({ party: 'Landlord', status: landlordStatus });
  }

  if (tenantStatus.needsVerification) {
    needsVerification.push({ party: 'Tenant', status: tenantStatus });
  }

  // ============================================
  // STEP 3: If verification needed, create users and send codes
  // ============================================
  if (needsVerification.length > 0) {
    console.log('❌ National IDs need verification:', needsVerification.map(v => v.party));
    
    let createdUsers = [];
    
    for (const item of needsVerification) {
      const { party, status } = item;
      
      if (status.isNew) {
        if (party === 'Landlord') {
          const result = await createUserWithVerification(
            landlordPhone,
            landlordFirstName,
            landlordLastName,
            landlordNationalId,
            'LANDLORD'
          );
          createdUsers.push({ party: 'Landlord', user: result.user });
        } else if (party === 'Tenant') {
          const result = await createUserWithVerification(
            tenantPhone,
            tenantFirstName,
            tenantLastName,
            tenantNationalId,
            'TENANT'
          );
          createdUsers.push({ party: 'Tenant', user: result.user });
        }
      } else if (status.user) {
        // Existing user - resend verification code
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        await prisma.nationalIdVerification.create({
          data: {
            userId: status.user.userId,
            code: code,
            expiresAt: expiresAt,
            used: false
          }
        });

        console.log(`\n📋 ${party} National ID verification required (resent).`);
        console.log(`   User ID: ${status.user.userId}`);
        console.log(`   (Request the verification code separately using this User ID)\n`);

        createdUsers.push({ party, user: status.user });
      }
    }
    
  
    const landlordUserId =
      createdUsers.find(u => u.party === 'Landlord')?.user.userId
      || landlordStatus.user?.userId
      || null;

    const tenantUserId =
      createdUsers.find(u => u.party === 'Tenant')?.user.userId
      || tenantStatus.user?.userId
      || null;

    const idParts = [];
    if (landlordUserId) idParts.push(`Landlord User ID: ${landlordUserId}`);
    if (tenantUserId) idParts.push(`Tenant User ID: ${tenantUserId}`);

    throw new Error(`The following National IDs need verification: ${needsVerification.map(v => v.party).join(', ')}. ${idParts.join(' | ')}.`);
  }

  // ============================================
  // STEP 4: All National IDs verified - Create FULL agreement in transaction
  // ============================================
  console.log('✅ All National IDs are verified! Creating agreement...');

  const txResult = await prisma.$transaction(async (tx) => {
    // 4.1: Get or create Landlord user
    let landlordUser = landlordStatus.user;
    if (!landlordUser) {
      landlordUser = await tx.user.create({
        data: {
          firstName: landlordFirstName,
          lastName: landlordLastName,
          phone: landlordPhone,
          nationalId: landlordNationalId || null,
          username: null,
          passwordHash: null,
          role: 'LANDLORD',
          isActive: true,
          isNationalIdVerified: true
        }
      });
      console.log('Landlord user created with ID:', landlordUser.userId);
    }

   
    let tenantUser = tenantStatus.user;
    if (!tenantUser) {
      tenantUser = await tx.user.create({
        data: {
          firstName: tenantFirstName,
          lastName: tenantLastName,
          phone: tenantPhone,
          nationalId: tenantNationalId || null,
          username: null,
          passwordHash: null,
          role: 'TENANT',
          isActive: true,
          isNationalIdVerified: true
        }
      });
      console.log('Tenant user created with ID:', tenantUser.userId);
    }

    
    let landlord = await tx.landlord.findUnique({
      where: { userId: landlordUser.userId }
    });
    if (!landlord) {
      landlord = await tx.landlord.create({
        data: {
          userId: landlordUser.userId,
          address: landlordAddress || null,
          subCity: landlordSubCity || null,
          woreda: landlordWoreda || null,
          houseNumber: landlordHouseNumber || null,
          businessLicense: landlordBusinessLicense || null,
          bankAccountNumber: landlordBankAccount || null
        }
      });
      console.log('Landlord profile created with ID:', landlord.landlordId);
    }

    
    let tenant = await tx.tenant.findUnique({
      where: { userId: tenantUser.userId }
    });
    if (!tenant) {
      tenant = await tx.tenant.create({
        data: {
          userId: tenantUser.userId,
          address: tenantAddress || null,
          subCity: tenantSubCity || null,
          woreda: tenantWoreda || null,
          houseNumber: tenantHouseNumber || null,
          emergencyContactName: tenantEmergencyContactName || null,
          emergencyContactPhone: tenantEmergencyContactPhone || null,
          employer: tenantEmployer || null
        }
      });
      console.log('Tenant profile created with ID:', tenant.tenantId);
    }


    const property = await tx.property.create({
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
    console.log('Property created with ID:', property.propertyId);

   
    const unit = await tx.unit.create({
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
    console.log('Unit created with ID:', unit.unitId);

   
    let paymentFrequency = await tx.paymentFrequency.findUnique({
      where: { name: paymentFrequencyName || 'MONTHLY' }
    });
    if (!paymentFrequency) {
      paymentFrequency = await tx.paymentFrequency.create({
        data: {
          name: paymentFrequencyName || 'MONTHLY',
          minimumInterval: 30,
          description: (paymentFrequencyName || 'MONTHLY') + ' rent payments'
        }
      });
      console.log('Payment frequency created with ID:', paymentFrequency.frequencyId);
    }

 
    const referenceNumber = await generateReferenceNumber();
    console.log('Generated reference number:', referenceNumber);

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
        status: 'PENDING_VERIFICATION', // NOT permanent - pending verification
        notes: notes || null
      },
      include: {
        landlord: { include: { user: true } },
        tenant: { include: { user: true } },
        unit: { include: { property: true } },
        paymentFrequency: true
      }
    });
    console.log('Agreement created with ID (PENDING):', agreement.agreementId);

    
    const tenantCode = generateVerificationCode();
    const landlordCode = generateVerificationCode();
    const tenantExpiry = afroSMSService.getCodeExpiry();
    const landlordExpiry = afroSMSService.getCodeExpiry();

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

    await tx.agreementVerification.create({
      data: {
        agreementId: agreement.agreementId,
        party: 'LANDLORD',
        phoneNumber: landlordUser.phone,
        codeHash: landlordCodeHash,
        expiresAt: landlordExpiry,
        status: 'PENDING'
      }
    });

    // 4.10: Audit log
    await tx.auditLog.create({
      data: {
        userId: userId,
        action: 'CREATE',
        entityType: 'RENTAL_AGREEMENT',
        entityId: agreement.agreementId,
        description: `Created rental agreement ${referenceNumber} (PENDING VERIFICATION)`
      }
    });

    console.log(`Tenant USSD Code (Signature): ${tenantCode}`);
    console.log(`Landlord USSD Code (Signature): ${landlordCode}`);


    return {
      agreement,
      tenantPhone: tenantUser.phone,
      landlordPhone: landlordUser.phone,
      tenantCode,
      landlordCode,
      tenantExpiry,
      landlordExpiry
    };
  }, {
    timeout: 1800000 
  });

  // Transaction has committed - now send the USSD codes
  await afroSMSService.sendUSSDConsentWithCode(
    txResult.tenantPhone,
    txResult.landlordPhone,
    txResult.agreement.agreementId,
    txResult.tenantCode,
    txResult.landlordCode,
    txResult.tenantExpiry,
    txResult.landlordExpiry
  );

  console.log('=== AGREEMENT CREATED. WAITING FOR USSD VERIFICATION ===');
  return txResult.agreement;
};


const rollbackAgreement = async (agreementId, reason = 'Verification failed', triggeredByUserId = null) => {
  console.log(`\n🔴 ROLLING BACK AGREEMENT ${agreementId}`);
  console.log(`   Reason: ${reason}\n`);

  return prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: agreementId }
    });

    if (!agreement) {
      console.log('Agreement already removed or not found. Skipping rollback.');
      return { rolledBack: false };
    }

    
    if (agreement.status === 'ACTIVE') {
      throw new Error('Cannot rollback an already active agreement');
    }

    const unitId = agreement.unitId;
    const refLabel = agreement.referenceNumber || agreementId;

   
    await tx.serviceFeePayment.deleteMany({ where: { agreementId: agreementId } });
    await tx.agreementVerification.deleteMany({ where: { agreementId: agreementId } });
    await tx.agreementApproval.deleteMany({ where: { agreementId: agreementId } });

  
    await tx.rentalAgreement.delete({ where: { agreementId: agreementId } });

 
    if (unitId) {
      const unit = await tx.unit.findUnique({ where: { unitId: unitId } });
      if (unit) {
        const propertyId = unit.propertyId;
        await tx.unit.delete({ where: { unitId: unitId } });

        if (propertyId) {
          const remainingUnits = await tx.unit.findMany({ where: { propertyId: propertyId } });
          if (remainingUnits.length === 0) {
            await tx.property.delete({ where: { propertyId: propertyId } });
          }
        }
      }
    }

    await tx.auditLog.create({
      data: {
        userId: triggeredByUserId,
        action: 'REJECT',
        entityType: 'RENTAL_AGREEMENT',
        entityId: agreementId,
        description: `ROLLBACK: agreement ${refLabel} removed - Reason: ${reason}`
      }
    });

    console.log('✅ Agreement, unit, property, verification and payment records removed.');
    return { rolledBack: true, reason };
  }, {
    timeout: 1800000
  });
};

// ============================================
// STEP 5: VERIFY USSD CODE (Signature) - If fails, rollback
// ============================================
const verifyAgreementCode = async (agreementId, phone, code) => {
  console.log('=== VERIFY USSD CODE (SIGNATURE) ===');
  console.log('agreementId:', agreementId);
  console.log('phone:', phone);
  console.log('code:', code);

  // Find the latest PENDING verification record for this party (ignore expiry for now
  // so we can tell an expired code apart from a code that was never sent)
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

  // Code expired without being confirmed - roll the whole agreement back
  if (verification.expiresAt <= new Date()) {
    await rollbackAgreement(agreementId, 'USSD signature code expired');
    throw new Error('USSD verification code expired. This agreement has been cancelled - please start over.');
  }

  // Verify the code
  const isMatch = await bcrypt.compare(code, verification.codeHash);
  if (!isMatch) {
    const updatedVerification = await prisma.agreementVerification.update({
      where: { verificationId: verification.verificationId },
      data: { attempts: { increment: 1 } }
    });

    if (updatedVerification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await rollbackAgreement(agreementId, `Too many failed USSD signature attempts (${updatedVerification.attempts})`);
      throw new Error('Too many failed attempts. This agreement has been cancelled - please start over.');
    }

    const remaining = MAX_VERIFICATION_ATTEMPTS - updatedVerification.attempts;
    throw new Error(`Invalid USSD verification code. ${remaining} attempt(s) remaining before this agreement is cancelled.`);
  }

  // Mark as verified
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

  console.log(`Verifications complete: ${verifications.length}/2`);

  // ============================================
  // STEP 6: AFTER BOTH VERIFIED - SEND PAYMENT USSD
  // ============================================
  if (verifications.length === 2) {
    console.log('✅ Both parties verified their USSD codes!');
    
    // Update agreement status to PENDING_SERVICE_FEE
    await prisma.rentalAgreement.update({
      where: { agreementId: agreementId },
      data: {
        status: 'PENDING_SERVICE_FEE',
        bothPartiesVerifiedAt: new Date()
      }
    });

    // Create service fee payment record
    await prisma.serviceFeePayment.create({
      data: {
        agreementId: agreementId,
        amount: 50,
        status: 'PENDING',
        provider: 'TELEBIRR',
        paymentMethod: 'MOBILE_MONEY'
      }
    });

    // Send USSD to tenant for payment
    const agreement = await prisma.rentalAgreement.findUnique({
      where: { agreementId: agreementId },
      include: { tenant: { include: { user: true } } }
    });

    console.log(`Sending payment USSD to tenant: ${agreement.tenant.user.phone}`);
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
// STEP 7: PROCESS SERVICE FEE PAYMENT
// ============================================
const processServiceFeePayment = async (agreementId, phone, pin) => {
  console.log('=== PROCESS SERVICE FEE PAYMENT ===');
  console.log('agreementId:', agreementId);
  console.log('phone:', phone);

  const serviceFee = await prisma.serviceFeePayment.findUnique({
    where: { agreementId: agreementId }
  });

  if (!serviceFee) {
    throw new Error('Service fee payment record not found');
  }

  if (serviceFee.status === 'PAID') {
    throw new Error('Service fee already paid');
  }

  // Mock PIN verification (in real system, this would call Telebirr API)
  if (pin !== '1234') {
   
    const priorFailures = await prisma.auditLog.count({
      where: {
        entityType: 'SERVICE_FEE_PAYMENT',
        entityId: agreementId,
        action: 'UPDATE',
        description: { startsWith: 'Invalid PIN attempt' }
      }
    });

    const attemptsSoFar = priorFailures + 1;

    await prisma.auditLog.create({
      data: {
        userId: null,
        action: 'UPDATE',
        entityType: 'SERVICE_FEE_PAYMENT',
        entityId: agreementId,
        description: `Invalid PIN attempt ${attemptsSoFar} for agreement ${agreementId}`
      }
    });

    if (attemptsSoFar >= MAX_PAYMENT_ATTEMPTS) {
      await rollbackAgreement(agreementId, `Too many failed Telebirr PIN attempts (${attemptsSoFar})`);
      throw new Error('Too many failed PIN attempts. This agreement has been cancelled - please start over.');
    }

    const remaining = MAX_PAYMENT_ATTEMPTS - attemptsSoFar;
    throw new Error(`Invalid PIN. ${remaining} attempt(s) remaining before this agreement is cancelled.`);
  }

  // Update payment
  const txId = 'TXN-' + Date.now();
  await prisma.serviceFeePayment.update({
    where: { agreementId: agreementId },
    data: {
      status: 'PAID',
      transactionReference: txId,
      externalRequestId: 'REQ-' + Date.now(),
      initiatedAt: new Date(),
      paidAt: new Date()
    }
  });

  // Update agreement status to APPROVED
  await prisma.rentalAgreement.update({
    where: { agreementId: agreementId },
    data: { status: 'APPROVED' }
  });

  console.log('✅ Service fee paid. Agreement approved. Waiting for officer final approval.');
  return {
    success: true,
    message: '50 Birr service fee paid successfully. Waiting for officer approval.',
    transactionId: txId
  };
};

// ============================================
// STEP 8: OFFICER APPROVES - FINAL PERMANENT SAVE
// ============================================
const approveAgreement = async (agreementId, officerUserId, comments = null) => {
  console.log('=== APPROVE AGREEMENT (FINAL) ===');
  console.log('agreementId:', agreementId);
  console.log('officerUserId:', officerUserId);

  const txResult = await prisma.$transaction(async (tx) => {
    //  Find the agreement
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: agreementId }
    });

    if (!agreement) throw new Error('Agreement not found');

    // Verify status is APPROVED
    if (agreement.status !== 'APPROVED') {
      throw new Error('Agreement must be in APPROVED status before final approval.');
    }

    // Find the officer
    const officer = await tx.officer.findUnique({
      where: { userId: officerUserId }
    });

    if (!officer) {
      throw new Error('Officer not found');
    }

    // Check verifications
    const verifications = await tx.agreementVerification.findMany({
      where: {
        agreementId: agreementId,
        status: 'VERIFIED'
      }
    });

    if (verifications.length < 2) {
      throw new Error('Both parties must verify before final approval');
    }

    //  Check service fee
    const serviceFee = await tx.serviceFeePayment.findUnique({
      where: { agreementId: agreementId }
    });

    if (!serviceFee || serviceFee.status !== 'PAID') {
      throw new Error('Service fee must be paid before final approval');
    }

    //  Generate final reference number
    const ref = await generateReferenceNumber();

    // Update unit status
    await tx.unit.update({
      where: { unitId: agreement.unitId },
      data: { status: 'OCCUPIED' }
    });

    // Update agreement to ACTIVE - PERMANENT SAVE
    const updated = await tx.rentalAgreement.update({
      where: { agreementId: agreementId },
      data: {
        status: 'ACTIVE',
        referenceNumber: ref
      }
    });

    // Create approval record
    const approval = await tx.agreementApproval.create({
      data: {
        agreementId: agreementId,
        officerId: officer.officerId,
        approvalType: 'FINAL_APPROVAL',
        decision: 'APPROVED',
        comments: comments || 'Approved after verification and payment'
      }
    });

    //  Audit log
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

    console.log('✅ Agreement permanently saved and activated!');
    return {
      agreement: updated,
      approval,
      referenceNumberGenerated: ref,
      landlordPhone: landlord.user.phone,
      tenantPhone: tenant.user.phone
    };
  }, {
    timeout: 1800000 
  });

  // Transaction has committed - now send the SMS
  await afroSMSService.sendReferenceNumberSMS(
    txResult.tenantPhone,
    txResult.landlordPhone,
    txResult.referenceNumberGenerated
  );

  return {
    agreement: txResult.agreement,
    approval: txResult.approval,
    referenceNumberGenerated: txResult.referenceNumberGenerated
  };
};

// ============================================
// GET AGREEMENT BY ID
// ============================================
const getAgreementById = async (agreementId) => {
  console.log('=== GET AGREEMENT ===');
  console.log('agreementId:', agreementId);

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
  
  return agreement;
};

// ============================================
// REJECT AGREEMENT (Rollback)
// ============================================
const rejectAgreement = async (agreementId, officerUserId, comments) => {
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.rentalAgreement.findUnique({
      where: { agreementId: agreementId }
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

    // Create rejection record
    await tx.agreementApproval.create({
      data: {
        agreementId: agreementId,
        officerId: officer.officerId,
        approvalType: 'FINAL_APPROVAL',
        decision: 'REJECTED',
        comments: comments || 'Rejected by officer'
      }
    });

    // Update agreement status to REJECTED
    const updated = await tx.rentalAgreement.update({
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

    console.log('❌ Agreement rejected and rolled back!');
    return { agreement: updated };
  }, {
    timeout: 1800000
  });
};

module.exports = {
  createAgreement,
  verifyAgreementCode,
  processServiceFeePayment,
  getAgreementById,
  approveAgreement,
  rejectAgreement,
  rollbackAgreement,
  generateReferenceNumber,
  verifyNationalId,
  validateNationalId,
  verifyNationalIdWithCode,
  getNationalIdVerificationCode
};