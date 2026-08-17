const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const afroSMSService = require('./afroSMSService');

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'smartrent_fallback_secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { userId: user.userId, username: user.username, role: user.role },
    secret,
    { expiresIn }
  );
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const registerUser = async (userData) => {
  const { firstName, middleName, lastName, phone, nationalId, username, password, role, profileData = {} } = userData;
  const normalizedRole = role.toUpperCase();

  if (!['OFFICER', 'SYSTEM_ADMIN'].includes(normalizedRole)) {
    throw new Error('Only OFFICER and SYSTEM_ADMIN can be registered directly.');
  }
  if (normalizedRole === 'SUPER_ADMIN') {
    throw new Error('Super Admin can only be created via seed script.');
  }

  if (!firstName || !lastName || !phone || !nationalId || !username || !password) {
    throw new Error('All required fields must be provided.');
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { nationalId }] }
  });
  if (existing) {
    if (existing.username === username) throw new Error('Username already taken');
    if (existing.nationalId === nationalId) throw new Error('National ID already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName,
        middleName,
        lastName,
        phone,
        nationalId,
        username,
        passwordHash,
        role: normalizedRole,
        isActive: true
      }
    });

    if (user.role === 'SYSTEM_ADMIN') {
      await tx.systemAdministrator.create({ data: { userId: user.userId } });
    } else if (user.role === 'OFFICER') {
      await tx.officer.create({
        data: {
          userId: user.userId,
          employeeId: profileData.employeeId || `EMP-${Date.now()}`,
          subCity: profileData.subCity || 'Addis Ababa',
          assignedTo: profileData.assignedTo || null
        }
      });
    }
    return user;
  });

  const token = generateToken(newUser);
  const { passwordHash: _, ...sanitizedUser } = newUser;
  return { user: sanitizedUser, token };
};

const loginUser = async (username, password) => {
  if (!username || !password) throw new Error('Username and password are required');

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      landlord: true,
      tenant: true,
      officer: true,
      systemAdministrator: true
    }
  });

  if (!user) throw new Error('Invalid username or password');
  if (!user.isActive) throw new Error('Account is inactive');
  if (!['OFFICER', 'SYSTEM_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new Error('Invalid login. Please use your dashboard credentials.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error('Invalid username or password');

  if (user.role === 'SYSTEM_ADMIN' && user.systemAdministrator) {
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.oTP.create({
      data: { userId: user.userId, code: otpCode, type: 'LOGIN', expiresAt }
    });
    await afroSMSService.sendOTP(user.phone, otpCode);
    return { requiresOTP: true, userId: user.userId, message: 'OTP sent to your phone' };
  }

  const token = generateToken(user);
  const { passwordHash: _, ...sanitizedUser } = user;
  return { user: sanitizedUser, token };
};

const verifyOTP = async (userId, code) => {
  const otp = await prisma.oTP.findFirst({
    where: { userId, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  });
  if (!otp) throw new Error('Invalid or expired OTP');

  await prisma.oTP.update({ where: { otpId: otp.otpId }, data: { used: true } });

  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) throw new Error('User not found');

  const token = generateToken(user);
  const { passwordHash: _, ...sanitizedUser } = user;
  return { user: sanitizedUser, token };
};

const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { userId: Number(userId) },
    include: {
      landlord: true,
      tenant: true,
      officer: true,
      systemAdministrator: true
    }
  });
  if (!user) throw new Error('User not found');
  const { passwordHash: _, ...sanitizedUser } = user;
  return sanitizedUser;
};

const createSystemAdmin = async (adminData, creatorUserId) => {
  const creator = await prisma.user.findUnique({ where: { userId: creatorUserId } });
  if (!creator || creator.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can create System Admins');
  }

  const existing = await prisma.user.findUnique({ where: { username: adminData.username } });
  if (existing) throw new Error('Username already taken');

  const passwordHash = await bcrypt.hash(adminData.password, 10);

  const newAdmin = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        phone: adminData.phone,
        nationalId: adminData.nationalId,
        username: adminData.username,
        passwordHash,
        role: 'SYSTEM_ADMIN',
        isActive: true
      }
    });
    await tx.systemAdministrator.create({ data: { userId: user.userId } });
    await tx.auditLog.create({
      data: { userId: creatorUserId, actionType: 'CREATE', entityType: 'SYSTEM_ADMIN', entityId: user.userId }
    });
    return user;
  });

  const { passwordHash: _, ...sanitizedAdmin } = newAdmin;
  return sanitizedAdmin;
};

const createOfficer = async (officerData, creatorUserId) => {
  const creator = await prisma.user.findUnique({ where: { userId: creatorUserId } });
  if (!creator || !['SYSTEM_ADMIN', 'SUPER_ADMIN'].includes(creator.role)) {
    throw new Error('Only System Admin or Super Admin can create Officers');
  }

  const existing = await prisma.user.findUnique({ where: { username: officerData.username } });
  if (existing) throw new Error('Username already taken');

  const passwordHash = await bcrypt.hash(officerData.password, 10);

  const newOfficer = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName: officerData.firstName,
        lastName: officerData.lastName,
        phone: officerData.phone,
        nationalId: officerData.nationalId,
        username: officerData.username,
        passwordHash,
        role: 'OFFICER',
        isActive: true
      }
    });
    await tx.officer.create({
      data: {
        userId: user.userId,
        employeeId: officerData.employeeId || `EMP-${Date.now()}`,
        subCity: officerData.subCity || 'Addis Ababa',
        assignedTo: officerData.assignedTo || null
      }
    });
    await tx.auditLog.create({
      data: { userId: creatorUserId, actionType: 'CREATE', entityType: 'OFFICER', entityId: user.userId }
    });
    return user;
  });

  const { passwordHash: _, ...sanitizedOfficer } = newOfficer;
  return sanitizedOfficer;
};

module.exports = {
  registerUser,
  loginUser,
  verifyOTP,
  getUserById,
  createSystemAdmin,
  createOfficer,
  generateToken,
  generateOTP
};