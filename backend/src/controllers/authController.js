const authService = require('../services/authService');

const register = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, message: 'User registered successfully', data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.loginUser(username, password);
    if (result.requiresOTP) {
      return res.status(200).json({ success: true, requiresOTP: true, userId: result.userId, message: result.message });
    }
    res.status(200).json({ success: true, message: 'Login successful', data: result });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { userId, code } = req.body;
    const result = await authService.verifyOTP(userId, code);
    res.status(200).json({ success: true, message: 'OTP verified successfully', data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    res.status(200).json({ success: true, message: 'User profile retrieved', data: user });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

const createSystemAdmin = async (req, res) => {
  try {
    const admin = await authService.createSystemAdmin(req.body, req.user.userId);
    res.status(201).json({ success: true, message: 'System Admin created successfully', data: admin });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const createOfficer = async (req, res) => {
  try {
    const officer = await authService.createOfficer(req.body, req.user.userId);
    res.status(201).json({ success: true, message: 'Officer created successfully', data: officer });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  register,
  login,
  verifyOTP,
  getMe,
  createSystemAdmin,
  createOfficer
};