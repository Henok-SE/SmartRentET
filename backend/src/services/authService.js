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

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { phone }] }
    });
    
    if (existing) {
      if (existing.username === username) throw new Error('Username already taken');
      if (existing.phone === phone) throw new Error('Phone number already registered');
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

    const token = generateToken(user);
    const { passwordHash: _, ...sanitizedUser } = user;
    return { user: sanitizedUser, token };
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

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
    if (user) {
      console.log('User role:', user.role);
      console.log('User isActive:', user.isActive);
    }

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

    // ============================================
    // OTP FOR OFFICE_ADMIN (One-time only)
    // ============================================
    if (user.role === 'OFFICE_ADMIN') {
      // Check if user has already verified OTP before (used OTP exists)
      const hasUsedOTP = await prisma.oTP.findFirst({
        where: {
          userId: user.userId,
          isOneTime: true,
          used: true
        }
      });

      // If user already verified OTP before → direct login (no OTP)
      if (hasUsedOTP) {
        console.log('User already verified OTP before. Skipping OTP.');
        const token = generateToken(user);
        const { passwordHash: _, ...sanitizedUser } = user;
        return { user: sanitizedUser, token };
      }

      // Check for existing unused OTP
      const existingOTP = await prisma.oTP.findFirst({
        where: {
          userId: user.userId,
          used: false,
          isOneTime: true,
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
            isOneTime: true,
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

    const token = generateToken(user);
    const { passwordHash: _, ...sanitizedUser } = user;
    console.log('Login successful for:', username);
    return { user: sanitizedUser, token };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

const verifyOTP = async (userId, code) => {
  try {
    console.log('=== VERIFY OTP ===');
    console.log('userId:', userId);
    console.log('code:', code);
    
    if (!userId || !code) {
      throw new Error('User ID and OTP code are required');
    }

    if (!prisma.oTP) {
      console.error('OTP model not found! Available models:', 
        Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'))
      );
      throw new Error('OTP model not configured. Please run database migrations.');
    }

    const otp = await prisma.oTP.findFirst({
      where: { 
        userId: userId, 
        code: code, 
        used: false,
        isOneTime: true,
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
        isOneTime: true,
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

    const { passwordHash: _, ...sanitizedUser } = user;
    
    if (isFirstTime) {
      const tempToken = jwt.sign(
        { userId: user.userId, username: user.username, role: user.role, tempAccess: true },
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
    } else {
      const token = generateToken(user);
      console.log('Returning user - no password change required');
      
      return {
        user: sanitizedUser,
        token,
        requiresPasswordChange: false,
        message: 'OTP verified successfully.'
      };
    }
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

    if (!['SUPER_ADMIN', 'OFFICE_ADMIN', 'OFFICER'].includes(user.role)) {
      throw new Error('Only Super Admins, Office Admins, and Officers can change password through this endpoint.');
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

    console.log('Password changed successfully for user:', user.username);
    
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

// ============================================
// UPDATE USERNAME (Optional)
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

    const { passwordHash: _, ...sanitizedUser } = user;
    console.log('Username updated successfully for user:', newUsername);
    
    return { user: sanitizedUser, message: 'Username updated successfully' };
  } catch (error) {
    console.error('Update username error:', error);
    throw error;
  }
};

// ============================================
// SEND NATIONAL ID VERIFICATION CODE
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
      message: 'Verification code sent to your phone',
    };
  } catch (error) {
    console.error('Send national ID verification error:', error);
    throw error;
  }
};

// ============================================
// VERIFY NATIONAL ID WITH OTP
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
    
    const { passwordHash: _, ...sanitizedUser } = user;
    return sanitizedUser;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
};

// ============================================
// CREATE OFFICE ADMIN
// ============================================
const createOfficeAdmin = async (adminData, creatorUserId) => {
  try {
    console.log('=== CREATE OFFICE ADMIN ===');
    console.log('adminData:', adminData);
    console.log('creatorUserId:', creatorUserId);
    
    const { firstName, lastName, phone, username, password, email, nationalId, officeId } = adminData;

    const creator = await prisma.user.findUnique({ 
      where: { userId: creatorUserId } 
    });
    
    if (!creator || creator.role !== 'SUPER_ADMIN') {
      throw new Error('Only Super Admin can create Office Admins');
    }

    const existing = await prisma.user.findUnique({ 
      where: { username } 
    });
    
    if (existing) {
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
        role: 'OFFICE_ADMIN',
        isActive: true,
        isNationalIdVerified: false
      }
    });

    await prisma.officeAdmin.create({
      data: {
        userId: user.userId,
        officeId: officeId || '1',
        employeeId: `ADMIN-${Date.now()}`
      }
    });

    // ============================================
    // SEND USERNAME & PASSWORD VIA SMS
    // ============================================
    await afroSMSService.sendSMS(
      phone,
      `SmartRent: Your account has been created.\nUsername: ${username}\nPassword: ${password}\nPlease login and change your password.`
    );

    console.log('SMS sent to:', phone);

    const { passwordHash: _, ...sanitizedUser } = user;
    return sanitizedUser;
  } catch (error) {
    console.error('Create office admin error:', error);
    throw error;
  }
};

// ============================================
// CREATE OFFICER
// ============================================
const createOfficer = async (officerData, creatorUserId) => {
  try {
    console.log('=== CREATE OFFICER ===');
    console.log('officerData:', officerData);
    console.log('creatorUserId:', creatorUserId);
    
    const { firstName, lastName, phone, username, password, email, nationalId, officeId, position, assignedArea } = officerData;

    const creator = await prisma.user.findUnique({ 
      where: { userId: creatorUserId } 
    });
    
    if (!creator || !['SUPER_ADMIN', 'OFFICE_ADMIN'].includes(creator.role)) {
      throw new Error('Only Super Admin or Office Admin can create Officers');
    }

    const existing = await prisma.user.findUnique({ 
      where: { username } 
    });
    
    if (existing) {
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
        role: 'OFFICER',
        isActive: true,
        isNationalIdVerified: false
      }
    });

    await prisma.officer.create({
      data: {
        userId: user.userId,
        officeId: officeId || '1',
        employeeId: `OFF-${Date.now()}`,
        position: position || null,
        assignedArea: assignedArea || null
      }
    });

    // ============================================
    // SEND USERNAME & PASSWORD VIA SMS
    // ============================================
    await afroSMSService.sendSMS(
      phone,
      `SmartRent: Your account has been created.\nUsername: ${username}\nPassword: ${password}\nPlease login to access the system.`
    );

    console.log('SMS sent to:', phone);

    const { passwordHash: _, ...sanitizedUser } = user;
    return sanitizedUser;
  } catch (error) {
    console.error('Create officer error:', error);
    throw error;
  }
};

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

module.exports = {
  registerUser,
  loginUser,
  verifyOTP,
  changePassword,
  updateUsername,
  sendNationalIdVerificationCode,
  verifyNationalIdWithOTP,
  getUserById,
  createOfficeAdmin,
  createOfficer,
  createLandlord,
  createTenant,
  generateToken,
  generateOTP
};
