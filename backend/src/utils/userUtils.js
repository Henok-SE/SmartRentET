// ============================================
// USER SANITIZATION - Remove passwordHash
// ============================================

const sanitizeUser = (user) => {
  if (!user) return null;
  
  const { passwordHash, ...sanitized } = user;
  return sanitized;
};

const sanitizeUserWithRelations = (user) => {
  if (!user) return null;
  
  const { passwordHash, ...sanitized } = user;
  
  if (sanitized.superAdmin?.user) {
    const { passwordHash: _, ...userData } = sanitized.superAdmin.user;
    sanitized.superAdmin.user = userData;
  }
  
  if (sanitized.officeAdmin?.user) {
    const { passwordHash: _, ...userData } = sanitized.officeAdmin.user;
    sanitized.officeAdmin.user = userData;
  }
  
  if (sanitized.officer?.user) {
    const { passwordHash: _, ...userData } = sanitized.officer.user;
    sanitized.officer.user = userData;
  }
  
  if (sanitized.landlord?.user) {
    const { passwordHash: _, ...userData } = sanitized.landlord.user;
    sanitized.landlord.user = userData;
  }
  
  if (sanitized.tenant?.user) {
    const { passwordHash: _, ...userData } = sanitized.tenant.user;
    sanitized.tenant.user = userData;
  }
  
  return sanitized;
};

// ============================================
// USERNAME GENERATION
// ============================================

const generateUsername = async (firstName, lastName) => {
  const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const prisma = require('../config/db');
  
  let username = baseUsername;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!existing) break;
    
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
};

// ============================================
// PASSWORD GENERATION
// ============================================

const generateSecurePassword = (length = 14) => {
  const crypto = require('crypto');
  
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specials = '!@#$%^&*()_+-=';
  
  const allChars = uppercase + lowercase + numbers + specials;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specials[Math.floor(Math.random() * specials.length)];
  
  const remaining = length - 4;
  const randomBytes = crypto.randomBytes(remaining);
  
  for (let i = 0; i < remaining; i++) {
    password += allChars[randomBytes[i] % allChars.length];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

const userDTO = (user) => {
  if (!user) return null;
  
  return {
    userId: user.userId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isNationalIdVerified: user.isNationalIdVerified
  };
};

const agreementDTO = (agreement) => {
  if (!agreement) return null;
  
  return {
    agreementId: agreement.agreementId,
    referenceNumber: agreement.referenceNumber,
    status: agreement.status,
    rentalAmount: agreement.rentalAmount,
    effectiveDate: agreement.effectiveDate,
    terminationDate: agreement.terminationDate,
    durationValue: agreement.durationValue,
    durationUnit: agreement.durationUnit,
    createdAt: agreement.createdAt,
    
    landlord: agreement.landlord ? {
      landlordId: agreement.landlord.landlordId,
      name: `${agreement.landlord.user?.firstName || ''} ${agreement.landlord.user?.lastName || ''}`.trim(),
      phone: agreement.landlord.user?.phone,
      address: agreement.landlord.address,
      subCity: agreement.landlord.subCity
    } : null,
    
    tenant: agreement.tenant ? {
      tenantId: agreement.tenant.tenantId,
      name: `${agreement.tenant.user?.firstName || ''} ${agreement.tenant.user?.lastName || ''}`.trim(),
      phone: agreement.tenant.user?.phone,
      address: agreement.tenant.address,
      subCity: agreement.tenant.subCity
    } : null,
    
    property: agreement.unit?.property ? {
      location: agreement.unit.property.location,
      subCity: agreement.unit.property.subCity,
      woreda: agreement.unit.property.woreda,
      propertyType: agreement.unit.property.propertyType
    } : null,
    
    unit: agreement.unit ? {
      unitNumber: agreement.unit.unitNumber,
      floor: agreement.unit.floor,
      sizeSqMeters: agreement.unit.sizeSqMeters,
      bedrooms: agreement.unit.bedrooms,
      bathrooms: agreement.unit.bathrooms
    } : null,
    
    office: agreement.office ? {
      officeId: agreement.office.officeId,
      officeCode: agreement.office.officeCode,
      officeName: agreement.office.officeName
    } : null,
    
    officer: agreement.createdByOfficer ? {
      officerId: agreement.createdByOfficer.officerId,
      name: `${agreement.createdByOfficer.user?.firstName || ''} ${agreement.createdByOfficer.user?.lastName || ''}`.trim()
    } : null,
    
    paymentFrequency: agreement.paymentFrequency ? {
      frequencyId: agreement.paymentFrequency.frequencyId,
      name: agreement.paymentFrequency.name,
      minimumInterval: agreement.paymentFrequency.minimumInterval
    } : null,
    
    serviceFee: agreement.serviceFeePayment ? {
      status: agreement.serviceFeePayment.status,
      amount: agreement.serviceFeePayment.amount,
      paidAt: agreement.serviceFeePayment.paidAt
    } : null,
    
    verifications: agreement.verifications?.map(v => ({
      party: v.party,
      status: v.status,
      verifiedAt: v.verifiedAt
    })) || []
  };
};

const officeDTO = (office) => {
  if (!office) return null;
  
  return {
    officeId: office.officeId,
    officeCode: office.officeCode,
    officeName: office.officeName,
    region: office.region,
    city: office.city,
    subCity: office.subCity,
    woreda: office.woreda,
    address: office.address,
    status: office.status,
    createdAt: office.createdAt,
    stats: office._count ? {
      officers: office._count.officers || 0,
      admins: office._count.officeAdmins || 0,
      agreements: office._count.agreements || 0
    } : undefined
  };
};

module.exports = {
  sanitizeUser,
  sanitizeUserWithRelations,
  generateUsername,
  generateSecurePassword,
  userDTO,
  agreementDTO,
  officeDTO
};