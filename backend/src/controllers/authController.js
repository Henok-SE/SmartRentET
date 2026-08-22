const authService = require('../services/authService');

const register = async (req, res) => {
  try {
    console.log('=== REGISTER ===');
    console.log('req.body:', req.body);
    const result = await authService.registerUser(req.body);
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully', 
      data: result 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

const login = async (req, res) => {
  try {
    console.log('=== LOGIN ===');
    console.log('req.body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    if (!req.body) {
      console.log('req.body is undefined!');
      return res.status(400).json({
        success: false,
        error: 'Request body is undefined. Make sure you are sending JSON with Content-Type: application/json'
      });
    }
    
    if (Object.keys(req.body).length === 0) {
      console.log('req.body is empty!');
      return res.status(400).json({
        success: false,
        error: 'Request body is empty. Make sure you are sending JSON data'
      });
    }
    
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
        debugOTP: result.debugOTP,
        requiresPasswordChange: result.requiresPasswordChange
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ success: false, error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    console.log('=== VERIFY OTP ===');
    console.log('req.body:', req.body);
    
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body is empty. Make sure you are sending JSON data'
      });
    }
    
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'userId and code are required fields'
      });
    }
    
    const result = await authService.verifyOTP(userId, code);
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: result,
      requiresPasswordChange: result.requiresPasswordChange,
      tempToken: result.tempToken
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
    console.log('req.body:', req.body);
    
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
    res.status(400).json({ success: false, error: error.message });
  }
};

// ============================================
// UPDATE USERNAME (Optional)
// ============================================
const updateUsername = async (req, res) => {
  try {
    console.log('=== UPDATE USERNAME ===');
    console.log('req.body:', req.body);
    console.log('req.user:', req.user);
    
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
      data: result.user
    });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ============================================
// SEND NATIONAL ID VERIFICATION
// ============================================
const sendNationalIdVerification = async (req, res) => {
  try {
    console.log('=== SEND NATIONAL ID VERIFICATION ===');
    console.log('req.body:', req.body);
    
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
      message: result.message,
      debugCode: result.debugCode
    });
  } catch (error) {
    console.error('Send national ID verification error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ============================================
// VERIFY NATIONAL ID
// ============================================
const verifyNationalId = async (req, res) => {
  try {
    console.log('=== VERIFY NATIONAL ID ===');
    console.log('req.body:', req.body);
    
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
    res.status(400).json({ success: false, error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'User profile endpoint',
      data: { user: 'Authenticated user' }
    });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

// ============================================
// CREATE OFFICE ADMIN
// ============================================
const createOfficeAdmin = async (req, res) => {
  try {
    console.log('=== CREATE OFFICE ADMIN ===');
    console.log('req.body:', req.body);
    console.log('req.user:', req.user);
    
    // ✅ FIX: Use the authenticated user's ID
    const admin = await authService.createOfficeAdmin(req.body, req.user.userId);
    res.status(201).json({
      success: true,
      message: 'Office Admin created successfully',
      data: admin
    });
  } catch (error) {
    console.error('Create Office Admin error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ============================================
// CREATE OFFICER
// ============================================
const createOfficer = async (req, res) => {
  try {
    console.log('=== CREATE OFFICER ===');
    console.log('req.body:', req.body);
    console.log('req.user:', req.user);
    
    const officer = await authService.createOfficer(req.body, req.user.userId);
    res.status(201).json({
      success: true,
      message: 'Officer created successfully',
      data: officer
    });
  } catch (error) {
    console.error('Create Officer error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  register,
  login,
  verifyOTP,
  changePassword,
  updateUsername,
  sendNationalIdVerification,
  verifyNationalId,
  getMe,
  createOfficeAdmin,
  createOfficer
};