const authService = require('../services/authService');

/**
 * Handle user registration
 */
const register = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};

/**
 * Handle user login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.loginUser(username, password);
    res.status(200).json({
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      error: error.message
    });
  }
};

/**
 * Get current authenticated user profile
 */
const getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    res.status(200).json({
      message: 'User profile retrieved',
      data: user
    });
  } catch (error) {
    res.status(404).json({
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe
};