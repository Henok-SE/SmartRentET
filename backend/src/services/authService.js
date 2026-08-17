const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

/**
 * Register a new user and create their role profile
 */
const registerUser = async (userData) => {
  const {
    firstName,
    lastName,
    phone,
    nationalId,
    username,
    password,
    role,
    profileData = {}
  } = userData;

  // 1. Basic validation
  if (!firstName || !lastName || !phone || !nationalId || !username || !password || !role) {
    throw new Error('All required fields must be provided: firstName, lastName, phone, nationalId, username, password, role');
  }

  // 2. Check if username or nationalId already exists
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    throw new Error('Username is already taken');
  }

  const existingNationalId = await prisma.user.findUnique({ where: { nationalId } });
  if (existingNationalId) {
    throw new Error('National ID is already registered');
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. Create User & associated Role Profile inside a Prisma transaction
  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        phone,
        nationalId,
        username,
        passwordHash,
        role: role.toUpperCase()
      }
    });

    // Create role specific profiles
    if (user.role === 'LANDLORD') {
      await tx.landlord.create({
        data: {
          userId: user.userId,
          address: profileData.address || 'N/A',
          houseNumber: profileData.houseNumber || 'N/A',
          businessLicense: profileData.businessLicense || null,
          bankAccountNumber: profileData.bankAccountNumber || null
        }
      });
    } else if (user.role === 'TENANT') {
      await tx.tenant.create({
        data: {
          userId: user.userId,
          emergencyContactName: profileData.emergencyContactName || null,
          emergencyContactPhone: profileData.emergencyContactPhone || null,
          employer: profileData.employer || null
        }
      });
    } else if (user.role === 'OFFICER') {
  await tx.officer.create({
    data: {
      user: {
        connect: {
          userId: user.userId
        }
      },
      office: {
        connect: {
          officeId: Number(profileData.officeId)
        }
      },
      employeeId: profileData.employeeId || `EMP-${Date.now()}`,
      subCity: profileData.subCity || 'Addis Ababa',
      assignedTo: profileData.assignedTo || null
    }
  });
}

    return user;
  });

  // 5. Generate token & return user info
  const token = generateToken(newUser);
  const { passwordHash: _, ...sanitizedUser } = newUser;

  return { user: sanitizedUser, token };
};

/**
 * Authenticate user and issue JWT token
 */
const loginUser = async (username, password) => {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  // 1. Find user by username
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      landlord: true,
      tenant: true,
      officer: true
    }
  });

  if (!user) {
    throw new Error('Invalid username or password');
  }

  if (!user.isActive) {
    throw new Error('Account is inactive. Please contact support.');
  }

  // 2. Verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid username or password');
  }

  // 3. Generate token & return user details
  const token = generateToken(user);
  const { passwordHash: _, ...sanitizedUser } = user;

  return { user: sanitizedUser, token };
};

/**
 * Get user by ID without passwordHash
 */
const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { userId: Number(userId) },
    include: {
      landlord: true,
      tenant: true,
      officer: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const { passwordHash: _, ...sanitizedUser } = user;
  return sanitizedUser;
};

/**
 * Generate JWT Token helper
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'smartrent_fallback_secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      role: user.role
    },
    secret,
    { expiresIn }
  );
};

module.exports = {
  registerUser,
  loginUser,
  getUserById
};
