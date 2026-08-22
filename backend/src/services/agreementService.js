const prisma = require('../config/db');
const afroSMSService = require('./afroSMSService');
const bcrypt = require('bcryptjs');

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
const verifyNationalId = async (nationalId, excludeUserId = null) => {
  if (!nationalId) return true;
  
  const existingUser = await prisma.user.findFirst({
    where: {
      nationalId: nationalId,
      ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {})
    }
  });
  
  return !existingUser;
};

// ============================================
// GENERATE UNIQUE REFERENCE NUMBER
// Format: AGR-2026-XK7D9F3M
// ============================================
const generateReferenceNumber = async () => {
  const year = new Date().getFullYear();
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  let referenceNumber = `AGR-${year}-${randomPart}`;
  let exists = await prisma.rentalAgreement.findUnique({
    where: { referenceNumber }
  });
  
  let attempts = 0;
  while (exists && attempts < 10) {
    randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    referenceNumber = `AGR-${year}-${randomPart}`;
    exists = await prisma.rentalAgreement.findUnique({
      where: { referenceNumber }
    });
    attempts++;
  }
  
  if (exists) {
    const timestamp = Date.now().toString(36).toUpperCase();
    referenceNumber = `AGR-${year}-${timestamp}`;
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
  // NATIONAL ID VALIDATION (Fixed)
  // ============================================
  // First check if landlord already exists by phone
  let existingLandlord = null;
  if (landlordPhone) {
    existingLandlord = await prisma.user.findFirst({
      where: {
        phone: landlordPhone,
        role: 'LANDLORD'
      }
    });
  }

  if (landlordNationalId) {
    if (!validateNationalId(landlordNationalId)) {
      throw new Error(`Landlord National ID must be exactly 16 digits.`);
    }
    // If landlord exists, exclude them from uniqueness check (they can reuse their own ID)
    const excludeUserId = existingLandlord ? existingLandlord.userId : null;
    const isUnique = await verifyNationalId(landlordNationalId, excludeUserId);
    if (!isUnique) {
      throw new Error(`Landlord National ID ${landlordNationalId} is already registered in the system.`);
    }
  }

  // First check if tenant already exists by phone
  let existingTenant = null;
  if (tenantPhone) {
    existingTenant = await prisma.user.findFirst({
      where: {
        phone: tenantPhone,
        role: 'TENANT'
      }
    });
  }

  if (tenantNationalId) {
    if (!validateNationalId(tenantNationalId)) {
      throw new Error(`Tenant National ID must be exactly 16 digits.`);
    }
    // If tenant exists, exclude them from uniqueness check (they can reuse their own ID)
    const excludeUserId = existingTenant ? existingTenant.userId : null;
    const isUnique = await verifyNationalId(tenantNationalId, excludeUserId);
    if (!isUnique) {
      throw new Error(`Tenant National ID ${tenantNationalId} is already registered in the system.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    console.log('=== STARTING TRANSACTION ===');

    console.log('Looking for landlord with phone:', landlordPhone);
    let landlordUser = await tx.user.findFirst({
      where: { 
        phone: landlordPhone,
        role: 'LANDLORD'
      }
    });

    let landlord;
    if (!landlordUser) {
      console.log('Creating new landlord user...');
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
          isNationalIdVerified: false
        }
      });
      console.log('Landlord user created with ID:', landlordUser.userId);

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
      console.log('Landlord record created with ID:', landlord.landlordId);
    } else {
      console.log('Landlord user found with ID:', landlordUser.userId);
      
      // ============================================
      // CHECK IF LANDLORD NATIONAL ID IS VERIFIED
      // ============================================
      if (landlordUser.nationalId && !landlordUser.isNationalIdVerified) {
        throw new Error(`Landlord National ID is not verified. Please verify your National ID first.`);
      }
      
      landlord = await tx.landlord.findUnique({
        where: { userId: landlordUser.userId }
      });
      
      if (!landlord) {
        console.log('Landlord record missing, creating...');
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
        console.log('Landlord record created with ID:', landlord.landlordId);
      } else {
        console.log('Landlord record found with ID:', landlord.landlordId);
      }
    }

    console.log('Looking for tenant with phone:', tenantPhone);
    let tenantUser = await tx.user.findFirst({
      where: { 
        phone: tenantPhone,
        role: 'TENANT'
      }
    });

    let tenant;
    if (!tenantUser) {
      console.log('Creating new tenant user...');
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
          isNationalIdVerified: false
        }
      });
      console.log('Tenant user created with ID:', tenantUser.userId);

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
      console.log('Tenant record created with ID:', tenant.tenantId);
    } else {
      console.log('Tenant user found with ID:', tenantUser.userId);
      
      // ============================================
      // CHECK IF TENANT NATIONAL ID IS VERIFIED
      // ============================================
      if (tenantUser.nationalId && !tenantUser.isNationalIdVerified) {
        throw new Error(`Tenant National ID is not verified. Please verify your National ID first.`);
      }
      
      tenant = await tx.tenant.findUnique({
        where: { userId: tenantUser.userId }
      });
      
      if (!tenant) {
        console.log('Tenant record missing, creating...');
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
        console.log('Tenant record created with ID:', tenant.tenantId);
      } else {
        console.log('Tenant record found with ID:', tenant.tenantId);
      }
    }

    if (!landlord) {
      throw new Error('Landlord record not found or could not be created');
    }
    if (!tenant) {
      throw new Error('Tenant record not found or could not be created');
    }

    console.log('Creating property...');
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

    console.log('Creating unit...');
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

    console.log('Creating/finding payment frequency...');
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
    } else {
      console.log('Payment frequency found with ID:', paymentFrequency.frequencyId);
    }

    console.log('Creating rental agreement...');
    console.log('Using officerId:', officerId);
    console.log('Using officeId:', officeId);
    console.log('Using landlordId:', landlord.landlordId);
    console.log('Using tenantId:', tenant.tenantId);
    console.log('Using unitId:', unit.unitId);
    console.log('Using paymentFrequencyId:', paymentFrequency.frequencyId);

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
        status: 'DRAFT',
        notes: notes || null
      },
      include: {
        landlord: { include: { user: true } },
        tenant: { include: { user: true } },
        unit: { include: { property: true } },
        paymentFrequency: true
      }
    });
    console.log('Agreement created with ID:', agreement.agreementId);

    console.log('Creating verification codes...');
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

    console.log('Creating audit log...');
    await tx.auditLog.create({
      data: {
        userId: userId,
        action: 'CREATE',
        entityType: 'RENTAL_AGREEMENT',
        entityId: agreement.agreementId,
        description: `Created rental agreement ${referenceNumber}`
      }
    });

    console.log(`Tenant Code: ${tenantCode}`);
    console.log(`Landlord Code: ${landlordCode}`);

    await afroSMSService.sendUSSDConsentWithCode(
      tenantUser.phone,
      landlordUser.phone,
      agreement.agreementId,
      tenantCode,
      landlordCode,
      tenantExpiry,
      landlordExpiry
    );

    console.log('=== AGREEMENT CREATED SUCCESSFULLY ===');
    return agreement;
  });
};

const verifyAgreementCode = async (agreementId, phone, code) => {
  console.log('=== VERIFY AGREEMENT CODE ===');
  console.log('agreementId:', agreementId);
  console.log('phone:', phone);
  console.log('code:', code);

  const verification = await prisma.agreementVerification.findFirst({
    where: {
      agreementId: agreementId,
      phoneNumber: phone,
      status: 'PENDING',
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!verification) {
    throw new Error('Verification code not found or expired');
  }

  const isMatch = await bcrypt.compare(code, verification.codeHash);
  if (!isMatch) {
    await prisma.agreementVerification.update({
      where: { verificationId: verification.verificationId },
      data: { attempts: { increment: 1 } }
    });
    throw new Error('Invalid verification code');
  }

  await prisma.agreementVerification.update({
    where: { verificationId: verification.verificationId },
    data: {
      status: 'VERIFIED',
      verifiedAt: new Date()
    }
  });

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
    message: 'Verification recorded. Waiting for other party.'
  };
};

const processServiceFeePayment = async (agreementId, phone, pin) => {
  console.log('=== PROCESS SERVICE FEE PAYMENT ===');
  console.log('agreementId:', agreementId);
  console.log('phone:', phone);

  if (pin !== '1234') {
    throw new Error('Invalid PIN. Please try again.');
  }

  const serviceFee = await prisma.serviceFeePayment.findUnique({
    where: { agreementId: agreementId }
  });

  if (!serviceFee) {
    throw new Error('Service fee payment record not found');
  }

  if (serviceFee.status === 'PAID') {
    throw new Error('Service fee already paid');
  }

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

  await prisma.rentalAgreement.update({
    where: { agreementId: agreementId },
    data: { status: 'APPROVED' }
  });

  return {
    success: true,
    message: '50 Birr service fee paid successfully. Waiting for officer approval.',
    transactionId: txId
  };
};

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

module.exports = {
  createAgreement,
  verifyAgreementCode,
  processServiceFeePayment,
  getAgreementById,
  generateReferenceNumber,
  verifyNationalId,
  validateNationalId
};