const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const afroSMSService = require('./afroSMSService');
const sessionService = require('./sessionService');
const {
  sanitizeUser,
  sanitizeUserWithRelations,
  generateUsername,
  generateSecurePassword,
  userDTO
} = require('../utils/userUtils');

// ============================================
// GENERATE OTP
// ============================================

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============================================
// LOGIN
// ============================================

const loginUser = async (username, password) => {
  try {
    console.log('=== LOGIN USER ===');
    console.log('Username:', username);

    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      throw new Error('Invalid username or password');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    if (!user.passwordHash) {
      throw new Error('Account has no password set. Please contact administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log('Password match:', isMatch ? 'Yes' : 'No');

    if (!isMatch) {
      throw new Error('Invalid username or password');
    }

    if (!['SUPER_ADMIN', 'OFFICE_ADMIN', 'OFFICER'].includes(user.role)) {
      throw new Error('Invalid login. Please use your dashboard credentials.');
    }

    // OTP FOR OFFICE_ADMIN (One-time only)
    if (user.role === 'OFFICE_ADMIN') {
      const hasUsedOTP = await prisma.oTP.findFirst({
        where: {
          userId: user.userId,
          type: 'LOGIN',
          used: true
        }
      });

      if (hasUsedOTP) {
        console.log('User already verified OTP before. Skipping OTP.');
        const { session, token } = await sessionService.createSession(
          user.userId,
          { username: user.username, role: user.role }
        );

        const sanitizedUser = sanitizeUser(user);
        return { user: sanitizedUser, token, sessionId: session.sessionId };
      }

      const existingOTP = await prisma.oTP.findFirst({
        where: {
          userId: user.userId,
          used: false,
          type: 'LOGIN',
          expiresAt: { gt: new Date() }
        }
      });

      let otpCode;
      if (existingOTP) {
        otpCode = existingOTP.code;
        console.log('Using existing OTP:', otpCode);
      } else {
        otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await prisma.oTP.create({
          data: {
            userId: user.userId,
            code: otpCode,
            type: 'LOGIN',
            expiresAt
          }
        });
      }

      await afroSMSService.sendOTP(user.phone, otpCode);

      console.log('OTP sent to:', user.phone);
      console.log('OTP code (for testing):', otpCode);

      return {
        requiresOTP: true,
        userId: user.userId,
        message: 'OTP sent to your phone',
        requiresPasswordChange: true
      };
    }

    const { session, token } = await sessionService.createSession(
      user.userId,
      { username: user.username, role: user.role }
    );

    const sanitizedUser = sanitizeUser(user);
    return { user: sanitizedUser, token, sessionId: session.sessionId };

  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// ============================================
// VERIFY OTP
// ============================================

const verifyOTP = async (userId, code) => {
  try {
    console.log('=== VERIFY OTP ===');
    console.log('userId:', userId);
    console.log('code:', code);

    if (!userId || !code) {
      throw new Error('User ID and OTP code are required');
    }

    const otp = await prisma.oTP.findFirst({
      where: {
        userId: userId,
        code: code,
        used: false,
        type: 'LOGIN',
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('OTP found:', otp ? 'Yes' : 'No');

    if (!otp) {
      throw new Error('Invalid or expired OTP');
    }

    const hasUsedOTP = await prisma.oTP.findFirst({
      where: {
        userId: userId,
        type: 'LOGIN',
        used: true
      }
    });

    console.log('Has used OTP before:', hasUsedOTP ? 'Yes' : 'No');

    await prisma.oTP.update({
      where: { otpId: otp.otpId },
      data: { used: true }
    });

    const user = await prisma.user.findUnique({
      where: { userId: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isFirstTime = !hasUsedOTP;
    console.log('Is first time login:', isFirstTime);

    const sanitizedUser = sanitizeUser(user);

    if (isFirstTime) {
      const tempToken = jwt.sign(
        {
          userId: user.userId,
          username: user.username,
          role: user.role,
          tempAccess: true
        },
        process.env.JWT_SECRET || 'smartrent_fallback_secret',
        { expiresIn: '15m' }
      );

      console.log('First time login - requires password change');

      return {
        user: sanitizedUser,
        tempToken,
        requiresPasswordChange: true,
        message: 'OTP verified. Please change your password.'
      };
    }

    const { session, token } = await sessionService.createSession(
      user.userId,
      { username: user.username, role: user.role }
    );

    return {
      user: sanitizedUser,
      token,
      sessionId: session.sessionId,
      requiresPasswordChange: false,
      message: 'OTP verified successfully.'
    };

  } catch (error) {
    console.error('OTP verification error:', error);
    throw error;
  }
};

// ============================================
// CHANGE PASSWORD
// ============================================

const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    console.log('=== CHANGE PASSWORD ===');
    console.log('userId:', userId);

    if (!userId || !currentPassword || !newPassword) {
      throw new Error('User ID, current password, and new password are required');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    const user = await prisma.user.findUnique({
      where: { userId: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { userId: userId },
      data: { passwordHash: newPasswordHash }
    });

    await sessionService.revokeAllSessions(userId);

    console.log('Password changed successfully for user:', user.username);

    return { success: true, message: 'Password changed successfully' };

  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

// ============================================
// CREATE OFFICE ADMIN - Auto-generate password only
// ============================================

const createOfficeAdmin = async (adminData, creatorUserId) => {
  try {
    console.log('=== CREATE OFFICE ADMIN ===');
    console.log('adminData:', adminData);
    console.log('creatorUserId:', creatorUserId);

    const { firstName, lastName, phone, email, nationalId, employeeId, officeId, username } = adminData;

    if (!username) {
      throw new Error('Username is required');
    }

    const creator = await prisma.user.findUnique({
      where: { userId: creatorUserId }
    });

    if (!creator || creator.role !== 'SUPER_ADMIN') {
      throw new Error('Only Super Admin can create Office Admins');
    }

    
    const existingUsername = await prisma.user.findUnique({
      where: { username: username }
    });

    if (existingUsername) {
      throw new Error('Username already taken. Please choose another.');
    }

    // ❌ REMOVED: Phone uniqueness check
    // ❌ REMOVED: Email uniqueness check
    // ❌ REMOVED: National ID uniqueness check

    const plainPassword = generateSecurePassword(14);
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        email: email || null,
        nationalId: nationalId || null,
        username,
        passwordHash,
        role: 'OFFICE_ADMIN',
        isActive: true,
        isNationalIdVerified: false
      }
    });

    await prisma.officeAdmin.create({
      data: {
        userId: user.userId,
        officeId: officeId,
        employeeId: employeeId
      }
    });

    await afroSMSService.sendSMS(
      phone,
      `SmartRent: Your account has been created.\nUsername: ${username}\nPassword: ${plainPassword}\nPlease login and change your password.`
    );

    console.log('SMS sent to:', phone);
    console.log('Username (provided):', username);
    console.log('Generated password:', plainPassword);

    const sanitizedUser = sanitizeUser(user);
    return {
      user: sanitizedUser,
      generatedUsername: username,
      passwordSent: true
    };

  } catch (error) {
    console.error('Create office admin error:', error);
    throw error;
  }
};

// ============================================
// CREATE OFFICER - Auto-generate password only
// ============================================

const createOfficer = async (officerData, creatorUserId) => {
  try {
    console.log('=== CREATE OFFICER ===');
    console.log('officerData:', officerData);
    console.log('creatorUserId:', creatorUserId);

    const {
      firstName,
      lastName,
      phone,
      email,
      nationalId,
      employeeId,
      officeId,
      position,
      assignedArea,
      username
    } = officerData;

    if (!username) {
      throw new Error('Username is required');
    }

    const creator = await prisma.user.findUnique({
      where: { userId: creatorUserId }
    });

    if (!creator || !['SUPER_ADMIN', 'OFFICE_ADMIN'].includes(creator.role)) {
      throw new Error('Only Super Admin or Office Admin can create Officers');
    }

    if (creator.role === 'OFFICE_ADMIN') {
      const admin = await prisma.officeAdmin.findUnique({
        where: { userId: creatorUserId }
      });

      if (!admin || admin.officeId !== officeId) {
        throw new Error('You can only create officers in your own office');
      }
    }

  
    const existingUsername = await prisma.user.findUnique({
      where: { username: username }
    });

    if (existingUsername) {
      throw new Error('Username already taken. Please choose another.');
    }


    const plainPassword = generateSecurePassword(14);
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        email: email || null,
        nationalId: nationalId || null,
        username,
        passwordHash,
        role: 'OFFICER',
        isActive: true,
        isNationalIdVerified: false
      }
    });

    await prisma.officer.create({
      data: {
        userId: user.userId,
        officeId: officeId,
        employeeId: employeeId,
        position: position || null,
        assignedArea: assignedArea || null
      }
    });

    await afroSMSService.sendSMS(
      phone,
      `SmartRent: Your account has been created.\nUsername: ${username}\nPassword: ${plainPassword}\nPlease login and change your password.`
    );

    console.log('SMS sent to:', phone);
    console.log('Username (provided):', username);
    console.log('Generated password:', plainPassword);

    const sanitizedUser = sanitizeUser(user);
    return {
      user: sanitizedUser,
      generatedUsername: username,
      passwordSent: true
    };

  } catch (error) {
    console.error('Create officer error:', error);
    throw error;
  }
};

// ============================================
// SET ACCOUNT STATUS (Activate/Deactivate)
// ============================================

const setAccountStatus = async (targetUserId, isActive, actingUserId) => {
  try {
    console.log('=== SET ACCOUNT STATUS ===');
    console.log('targetUserId:', targetUserId);
    console.log('isActive:', isActive);
    console.log('actingUserId:', actingUserId);

    if (typeof isActive !== 'boolean') {
      throw new Error('isActive must be true or false');
    }

    if (targetUserId === actingUserId) {
      throw new Error('You cannot activate or deactivate your own account');
    }

    const actingUser = await prisma.user.findUnique({
      where: { userId: actingUserId }
    });

    if (!actingUser) {
      throw new Error('Acting user not found');
    }

    const targetUser = await prisma.user.findUnique({
      where: { userId: targetUserId },
      include: { officeAdmin: true, officer: true }
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    if (!['OFFICE_ADMIN', 'OFFICER'].includes(targetUser.role)) {
      throw new Error('This endpoint can only activate/deactivate Office Admin or Officer accounts');
    }

    if (actingUser.role === 'SUPER_ADMIN') {
      // Super Admin can manage any Office Admin or Officer
    } else if (actingUser.role === 'OFFICE_ADMIN') {
      if (targetUser.role !== 'OFFICER') {
        throw new Error('Office Admins can only activate/deactivate Officer accounts');
      }

      const actingAdmin = await prisma.officeAdmin.findUnique({
        where: { userId: actingUserId }
      });

      if (!actingAdmin) {
        throw new Error('Office Admin record not found for the acting user');
      }

      if (!targetUser.officer || targetUser.officer.officeId !== actingAdmin.officeId) {
        throw new Error('You can only manage Officers within your own office');
      }
    } else {
      throw new Error('Only Super Admin or Office Admin can activate/deactivate accounts');
    }

    const updated = await prisma.user.update({
      where: { userId: targetUserId },
      data: { isActive }
    });

    if (!isActive) {
      await sessionService.revokeAllSessions(targetUserId);
    }

    await prisma.auditLog.create({
      data: {
        userId: actingUserId,
        action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'USER',
        entityId: targetUserId,
        description: `${isActive ? 'Activated' : 'Deactivated'} ${targetUser.role} account (${targetUser.username || targetUser.phone})`
      }
    });

    console.log(`Account ${isActive ? 'activated' : 'deactivated'}:`, targetUser.username || targetUser.phone);

    const sanitizedUser = sanitizeUser(updated);
    return sanitizedUser;

  } catch (error) {
    console.error('Set account status error:', error);
    throw error;
  }
};

// ============================================
// GET USER BY ID
// ============================================

const getUserById = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: userId },
      include: {
        superAdmin: true,
        officeAdmin: true,
        officer: true,
        landlord: true,
        tenant: true
      }
    });

    if (!user) throw new Error('User not found');

    const sanitizedUser = sanitizeUser(user);
    return sanitizedUser;

  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
};

// ============================================
// UPDATE USERNAME
// ============================================

const updateUsername = async (userId, newUsername) => {
  try {
    console.log('=== UPDATE USERNAME ===');
    console.log('userId:', userId);
    console.log('newUsername:', newUsername);

    if (!userId || !newUsername) {
      throw new Error('User ID and new username are required');
    }

    const existing = await prisma.user.findFirst({
      where: {
        username: newUsername,
        NOT: { userId: userId }
      }
    });

    if (existing) {
      throw new Error('Username already taken');
    }

    const user = await prisma.user.update({
      where: { userId: userId },
      data: { username: newUsername }
    });

    const sanitizedUser = sanitizeUser(user);
    console.log('Username updated successfully for user:', newUsername);

    return { user: sanitizedUser, message: 'Username updated successfully' };

  } catch (error) {
    console.error('Update username error:', error);
    throw error;
  }
};

// ============================================
// SEND NATIONAL ID VERIFICATION
// ============================================

const sendNationalIdVerificationCode = async (userId) => {
  try {
    console.log('=== SEND NATIONAL ID VERIFICATION ===');
    console.log('userId:', userId);

    const user = await prisma.user.findUnique({
      where: { userId: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.nationalId) {
      throw new Error('User has no National ID registered');
    }

    if (user.isNationalIdVerified) {
      throw new Error('National ID already verified');
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.nationalIdVerification.create({
      data: {
        userId: user.userId,
        code: code,
        expiresAt: expiresAt
      }
    });

    await afroSMSService.sendNationalIdVerification(user.phone, code);

    console.log('National ID verification code sent to:', user.phone);
    console.log('Code (for testing):', code);

    return {
      success: true,
      message: 'Verification code sent to your phone'
    };

  } catch (error) {
    console.error('Send national ID verification error:', error);
    throw error;
  }
};

// ============================================
// VERIFY NATIONAL ID
// ============================================

const verifyNationalIdWithOTP = async (userId, code) => {
  try {
    console.log('=== VERIFY NATIONAL ID ===');
    console.log('userId:', userId);
    console.log('code:', code);

    if (!userId || !code) {
      throw new Error('User ID and code are required');
    }

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

    await prisma.nationalIdVerification.update({
      where: { verificationId: verification.verificationId },
      data: { used: true }
    });

    await prisma.user.update({
      where: { userId: userId },
      data: { isNationalIdVerified: true }
    });

    console.log('National ID verified for user:', userId);
    return { success: true, message: 'National ID verified successfully' };

  } catch (error) {
    console.error('Verify national ID error:', error);
    throw error;
  }
};

// ============================================
// CREATE LANDLORD
// ============================================

const createLandlord = async (landlordData) => {
  try {
    const user = await prisma.user.create({
      data: {
        firstName: landlordData.firstName,
        lastName: landlordData.lastName,
        phone: landlordData.phone,
        nationalId: landlordData.nationalId || null,
        username: null,
        passwordHash: null,
        role: 'LANDLORD',
        isActive: true,
        isNationalIdVerified: false
      }
    });

    await prisma.landlord.create({
      data: {
        userId: user.userId,
        address: landlordData.address || null,
        subCity: landlordData.subCity || null,
        woreda: landlordData.woreda || null,
        houseNumber: landlordData.houseNumber || null,
        businessLicense: landlordData.businessLicense || null,
        bankAccountNumber: landlordData.bankAccountNumber || null
      }
    });

    return user;

  } catch (error) {
    console.error('Create landlord error:', error);
    throw error;
  }
};

// ============================================
// CREATE TENANT
// ============================================

const createTenant = async (tenantData) => {
  try {
    const user = await prisma.user.create({
      data: {
        firstName: tenantData.firstName,
        lastName: tenantData.lastName,
        phone: tenantData.phone,
        nationalId: tenantData.nationalId || null,
        username: null,
        passwordHash: null,
        role: 'TENANT',
        isActive: true,
        isNationalIdVerified: false
      }
    });

    await prisma.tenant.create({
      data: {
        userId: user.userId,
        address: tenantData.address || null,
        subCity: tenantData.subCity || null,
        woreda: tenantData.woreda || null,
        houseNumber: tenantData.houseNumber || null,
        emergencyContactName: tenantData.emergencyContactName || null,
        emergencyContactPhone: tenantData.emergencyContactPhone || null,
        employer: tenantData.employer || null
      }
    });

    return user;

  } catch (error) {
    console.error('Create tenant error:', error);
    throw error;
  }
};

// ============================================
// REGISTER USER
// ============================================

const registerUser = async (userData) => {
  try {
    console.log('=== REGISTER USER ===');
    console.log('userData:', userData);

    const { firstName, lastName, phone, email, nationalId, username, password, role, profileData = {} } = userData;
    const normalizedRole = role.toUpperCase();

    if (!['SUPER_ADMIN', 'OFFICE_ADMIN', 'OFFICER'].includes(normalizedRole)) {
      throw new Error('Only SUPER_ADMIN, OFFICE_ADMIN, and OFFICER can be registered directly.');
    }

    if (!firstName || !lastName || !phone || !username || !password) {
      throw new Error('All required fields must be provided.');
    }

  
    const existingUsername = await prisma.user.findUnique({
      where: { username: username }
    });

    if (existingUsername) {
      throw new Error('Username already taken');
    }


    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        email: email || null,
        nationalId: nationalId || null,
        username,
        passwordHash,
        role: normalizedRole,
        isActive: true,
        isNationalIdVerified: false
      }
    });

    if (user.role === 'SUPER_ADMIN') {
      await prisma.superAdmin.create({ data: { userId: user.userId } });
    } else if (user.role === 'OFFICE_ADMIN') {
      await prisma.officeAdmin.create({
        data: {
          userId: user.userId,
          officeId: profileData.officeId || '1',
          employeeId: profileData.employeeId || `ADMIN-${Date.now()}`
        }
      });
    } else if (user.role === 'OFFICER') {
      await prisma.officer.create({
        data: {
          userId: user.userId,
          officeId: profileData.officeId || '1',
          employeeId: profileData.employeeId || `OFF-${Date.now()}`,
          position: profileData.position || null,
          assignedArea: profileData.assignedArea || null
        }
      });
    }

    const sanitizedUser = sanitizeUser(user);
    return { user: sanitizedUser };

  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  loginUser,
  verifyOTP,
  changePassword,
  createOfficeAdmin,
  createOfficer,
  setAccountStatus,
  getUserById,
  updateUsername,
  sendNationalIdVerificationCode,
  verifyNationalIdWithOTP,
  createLandlord,
  createTenant,
  registerUser,
  generateOTP
};