const authService = require('../services/authService');
const { userDTO } = require('../utils/userUtils');

// ============================================
// LOGIN
// ============================================

const login = async (req, res) => {
  try {
    console.log('=== LOGIN ===');

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const result = await authService.loginUser(username, password);

    if (result.requiresOTP) {
      return res.status(200).json({
        success: true,
        requiresOTP: true,
        userId: result.userId,
        message: result.message,
        requiresPasswordChange: result.requiresPasswordChange
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userDTO(result.user),
        token: result.token,
        sessionId: result.sessionId
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// VERIFY OTP
// ============================================

const verifyOTP = async (req, res) => {
  try {
    console.log('=== VERIFY OTP ===');

    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'userId and code are required'
      });
    }

    const result = await authService.verifyOTP(userId, code);

    if (result.requiresPasswordChange) {
      return res.status(200).json({
        success: true,
        message: result.message,
        requiresPasswordChange: true,
        tempToken: result.tempToken,
        user: userDTO(result.user)
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: userDTO(result.user),
        token: result.token,
        sessionId: result.sessionId
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// CHANGE PASSWORD
// ============================================

const changePassword = async (req, res) => {
  try {
    console.log('=== CHANGE PASSWORD ===');

    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'userId, currentPassword, and newPassword are required'
      });
    }

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// CREATE OFFICE ADMIN
// ============================================

const createOfficeAdmin = async (req, res) => {
  try {
    console.log('=== CREATE OFFICE ADMIN ===');

    const result = await authService.createOfficeAdmin(req.body, req.user.userId);

    res.status(201).json({
      success: true,
      message: 'Office Admin created successfully. Password sent via SMS.',
      data: {
        user: userDTO(result.user),
        generatedUsername: result.generatedUsername,
        passwordSent: result.passwordSent
      }
    });

  } catch (error) {
    console.error('Create Office Admin error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// CREATE OFFICER
// ============================================

const createOfficer = async (req, res) => {
  try {
    console.log('=== CREATE OFFICER ===');

    const result = await authService.createOfficer(req.body, req.user.userId);

    res.status(201).json({
      success: true,
      message: 'Officer created successfully. Password sent via SMS.',
      data: {
        user: userDTO(result.user),
        generatedUsername: result.generatedUsername,
        passwordSent: result.passwordSent
      }
    });

  } catch (error) {
    console.error('Create Officer error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// SET ACCOUNT STATUS (Activate/Deactivate)
// ============================================

const setAccountStatus = async (req, res) => {
  try {
    console.log('=== SET ACCOUNT STATUS ===');

    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be true or false'
      });
    }

    const result = await authService.setAccountStatus(id, isActive, req.user.userId);

    res.status(200).json({
      success: true,
      message: `Account ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: userDTO(result)
    });

  } catch (error) {
    console.error('Set account status error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET CURRENT USER
// ============================================

const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: userDTO(req.user)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// UPDATE USERNAME
// ============================================

const updateUsername = async (req, res) => {
  try {
    console.log('=== UPDATE USERNAME ===');

    const { newUsername } = req.body;

    if (!newUsername) {
      return res.status(400).json({
        success: false,
        error: 'newUsername is required'
      });
    }

    const result = await authService.updateUsername(req.user.userId, newUsername);

    res.status(200).json({
      success: true,
      message: result.message,
      data: userDTO(result.user)
    });

  } catch (error) {
    console.error('Update username error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// SEND NATIONAL ID VERIFICATION
// ============================================

const sendNationalIdVerification = async (req, res) => {
  try {
    console.log('=== SEND NATIONAL ID VERIFICATION ===');

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await authService.sendNationalIdVerificationCode(userId);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Send national ID verification error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// VERIFY NATIONAL ID
// ============================================

const verifyNationalId = async (req, res) => {
  try {
    console.log('=== VERIFY NATIONAL ID ===');

    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'userId and code are required'
      });
    }

    const result = await authService.verifyNationalIdWithOTP(userId, code);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Verify national ID error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// REGISTER
// ============================================

const register = async (req, res) => {
  try {
    console.log('=== REGISTER ===');

    const result = await authService.registerUser(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: userDTO(result.user)
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  login,
  verifyOTP,
  changePassword,
  createOfficeAdmin,
  createOfficer,
  setAccountStatus,
  getMe,
  updateUsername,
  sendNationalIdVerification,
  verifyNationalId,
  register
};