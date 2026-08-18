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
    
    // Check if body exists
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
        message: result.message
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
      data: result
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const getMe = async (req, res) => {
  try {
    // For now, just return a simple response
    res.status(200).json({
      success: true,
      message: 'User profile endpoint',
      data: { user: 'Authenticated user' }
    });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

const createOfficeAdmin = async (req, res) => {
  try {
    console.log('=== CREATE OFFICE ADMIN ===');
    console.log('req.body:', req.body);
    const admin = await authService.createOfficeAdmin(req.body, 1); // temporary userId
    res.status(201).json({
      success: true,
      message: 'Office Admin created successfully',
      data: admin
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const createOfficer = async (req, res) => {
  try {
    console.log('=== CREATE OFFICER ===');
    console.log('req.body:', req.body);
    const officer = await authService.createOfficer(req.body, 1); // temporary userId
    res.status(201).json({
      success: true,
      message: 'Officer created successfully',
      data: officer
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  register,
  login,
  verifyOTP,
  getMe,
  createOfficeAdmin,
  createOfficer
};