const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const {
  validateRequiredFields,
  isValidPhone,
  isValidUsername,
  isValidNationalId
} = require('../utils/validation');

const createUser = async (userData) => {
  const {
    firstName,
    lastName,
    phone,
    nationalId,
    username,
    password,
    role,
    address,
    subCity,
    houseNumber,
    businessLicense,
    tinNumber,
    bankAccountNumber,
    employeeId,
    emergencyContactName,
    emergencyContactPhone,
    employer
  } = userData;

  const required = ['firstName', 'lastName', 'phone', 'nationalId', 'username', 'password', 'role'];
  const validation = validateRequiredFields(userData, required);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  if (!isValidPhone(phone)) {
    throw new Error('Invalid phone number. Must be 09xxxxxxxx or 07xxxxxxxx');
  }

  if (!isValidNationalId(nationalId)) {
    throw new Error('National ID must be at least 5 characters');
  }

  if (!isValidUsername(username)) {
    throw new Error('Username must be 3-30 characters (letters, numbers, underscore only)');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { nationalId },
        { phone }
      ]
    }
  });

  if (existingUser) {
    if (existingUser.username === username) {
      throw new Error('Username already exists');
    }
    if (existingUser.nationalId === nationalId) {
      throw new Error('National ID already exists');
    }
    if (existingUser.phone === phone) {
      throw new Error('Phone number already exists');
    }
  }

  const validRoles = ['LANDLORD', 'TENANT', 'OFFICER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    throw new Error('Invalid role. Must be: ' + validRoles.join(', '));
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        phone,
        nationalId,
        username,
        passwordHash,
        role,
        isActive: true
      },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        phone: true,
        nationalId: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    if (role === 'LANDLORD') {
      await tx.landlord.create({
        data: {
          userId: user.userId,
          address: address || '',
          subCity: subCity || '',
          houseNumber: houseNumber || '',
          businessLicense: businessLicense || null,
          tinNumber: tinNumber || null,
          bankAccountNumber: bankAccountNumber || null
        }
      });
    } else if (role === 'TENANT') {
      await tx.tenant.create({
        data: {
          userId: user.userId,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
          employer: employer || null
        }
      });
    } else if (role === 'OFFICER') {
      await tx.officer.create({
        data: {
          userId: user.userId,
          employeeId: employeeId || 'EMP' + Date.now(),
          subCity: subCity || ''
        }
      });
    } else if (role === 'ADMIN') {
      await tx.systemAdministrator.create({
        data: {
          userId: user.userId
        }
      });
    }

    return user;
  });

  return result;
};

const getUserByUsername = async (username) => {
  return prisma.user.findUnique({
    where: { username }
  });
};

const getUserById = async (userId) => {
  return prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      phone: true,
      nationalId: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  verifyPassword
};