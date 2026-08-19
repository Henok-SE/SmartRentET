const prisma = require('../config/db');
const afroSMSService = require('./afroSMSService');
const bcrypt = require('bcryptjs');

const generateReferenceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.rentalAgreement.count();
  const sequence = String(count + 1).padStart(6, '0');
  return `AGR-${year}-${sequence}`;
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashCode = async (code) => {
  const saltRounds = 10;
  return bcrypt.hash(code, saltRounds);
};

const createAgreement = async (data, officerId, officeId) => {
  console.log('=== AGREEMENT SERVICE ===');
  console.log('officerId:', officerId);
  console.log('officeId:', officeId);
  console.log('data received:', Object.keys(data));

  // Validate officerId exists
  if (!officerId) {
    throw new Error('officerId is required. Please ensure you are logged in as an Officer.');
  }

  // Validate officeId exists
  if (!officeId) {
    throw new Error('officeId is required.');
  }

  const {
    // Landlord
    landlordFirstName, landlordLastName, landlordPhone, landlordNationalId,
    landlordAddress, landlordSubCity, landlordWoreda, landlordHouseNumber,
    landlordBusinessLicense, landlordBankAccount,
    // Tenant
    tenantFirstName, tenantLastName, tenantPhone, tenantNationalId,
    tenantAddress, tenantSubCity, tenantWoreda, tenantHouseNumber,
    tenantEmergencyContactName, tenantEmergencyContactPhone, tenantEmployer,
    // Property
    propertyLocation, propertySubCity, propertyWoreda, propertyHouseNumber,
    propertyType, numberOfUnits,
    // Unit
    unitNumber, unitFloor, unitSizeSqMeters, unitBedrooms, unitBathrooms,
    unitRentAmountFloor,
    // Agreement - Government Form Section 3
    houseType, houseNumber, numberOfRooms, numberOfBathrooms,
    numberOfDoors, numberOfWindows, houseItems,
    // Agreement - Government Form Section 4
    durationValue, durationUnit, effectiveDate, terminationDate,
    rentalAmount, paymentTerms, advancePayment,
    // Payment Frequency
    paymentFrequencyName,
    // Agreement
    notes
  } = data;

  return prisma.$transaction(async (tx) => {
    console.log('=== STARTING TRANSACTION ===');

    // 1. Create or find Landlord
    console.log('Looking for landlord with phone:', landlordPhone);
    let landlordUser = await tx.user.findFirst({
      where: { phone: landlordPhone }
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
          isActive: true
        }
      });
      console.log('Landlord user created with ID:', landlordUser.userId);

      // Create landlord record
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
      // Get existing landlord
      landlord = await tx.landlord.findUnique({
        where: { userId: landlordUser.userId }
      });
      
      // If landlord record doesn't exist, create it
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

    // 2. Create or find Tenant
    console.log('Looking for tenant with phone:', tenantPhone);
    let tenantUser = await tx.user.findFirst({
      where: { phone: tenantPhone }
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
          isActive: true
        }
      });
      console.log('Tenant user created with ID:', tenantUser.userId);

      // Create tenant record
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
      // Get existing tenant
      tenant = await tx.tenant.findUnique({
        where: { userId: tenantUser.userId }
      });
      
      // If tenant record doesn't exist, create it
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

    // Verify landlord and tenant exist
    if (!landlord) {
      throw new Error('Landlord record not found or could not be created');
    }
    if (!tenant) {
      throw new Error('Tenant record not found or could not be created');
    }

    // 3. Create Property
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

    // 4. Create Unit
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

    // 5. Create Payment Frequency
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

    // 6. Create Rental Agreement
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
        // Government Form - Section 3
        houseType: houseType || 'Apartment',
        houseNumber: houseNumber || 'N/A',
        numberOfRooms: numberOfRooms || 0,
        numberOfBathrooms: numberOfBathrooms || 0,
        numberOfDoors: numberOfDoors || 0,
        numberOfWindows: numberOfWindows || 0,
        houseItems: houseItems || null,
        // Government Form - Section 4
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

    // 7. Create Agreement Verifications
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

    // 8. Audit log
    console.log('Creating audit log...');
    await tx.auditLog.create({
      data: {
        userId: officerId,
        action: 'CREATE',
        entityType: 'RENTAL_AGREEMENT',
        entityId: agreement.agreementId,
        description: `Created rental agreement ${referenceNumber}`
      }
    });

    // 9. Send USSD verification codes
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
      agreementId: Number(agreementId),
      phoneNumber: phone,
      status: 'PENDING',
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!verification) {
    throw new Error('Verification code not found or expired');
  }

  // Verify code
  const isMatch = await bcrypt.compare(code, verification.codeHash);
  if (!isMatch) {
    // Increment attempts
    await prisma.agreementVerification.update({
      where: { verificationId: verification.verificationId },
      data: { attempts: { increment: 1 } }
    });
    throw new Error('Invalid verification code');
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
      agreementId: Number(agreementId),
      status: 'VERIFIED'
    }
  });

  if (verifications.length === 2) {
    // Both parties verified
    await prisma.rentalAgreement.update({
      where: { agreementId: Number(agreementId) },
      data: {
        status: 'PENDING_SERVICE_FEE',
        bothPartiesVerifiedAt: new Date()
      }
    });

    // Create Service Fee Payment record
    await prisma.serviceFeePayment.create({
      data: {
        agreementId: Number(agreementId),
        amount: 50,
        status: 'PENDING',
        provider: 'TELEBIRR',
        paymentMethod: 'MOBILE_MONEY'
      }
    });

    // Send USSD to tenant for payment
    const agreement = await prisma.rentalAgreement.findUnique({
      where: { agreementId: Number(agreementId) },
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

  // Mock PIN verification
  if (pin !== '1234') {
    throw new Error('Invalid PIN. Please try again.');
  }

  const serviceFee = await prisma.serviceFeePayment.findUnique({
    where: { agreementId: Number(agreementId) }
  });

  if (!serviceFee) {
    throw new Error('Service fee payment record not found');
  }

  if (serviceFee.status === 'PAID') {
    throw new Error('Service fee already paid');
  }

  // Update payment
  const txId = 'TXN-' + Date.now();
  await prisma.serviceFeePayment.update({
    where: { agreementId: Number(agreementId) },
    data: {
      status: 'PAID',
      transactionReference: txId,
      externalRequestId: 'REQ-' + Date.now(),
      initiatedAt: new Date(),
      paidAt: new Date()
    }
  });

  // Update agreement status
  await prisma.rentalAgreement.update({
    where: { agreementId: Number(agreementId) },
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
    where: { agreementId: Number(agreementId) },
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
  generateReferenceNumber
};