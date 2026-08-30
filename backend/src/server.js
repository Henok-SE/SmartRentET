const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// GLOBAL MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// IMPORT ROUTES
// ============================================
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const agreementRoutes = require('./routes/agreementRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const officeRoutes = require('./routes/officeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  res.json({
    message: 'SmartRent ET Backend API',
    version: '2.0.0',
    status: 'running'
  });
});

// ============================================
// MOUNT ROUTES - NO AUTH MIDDLEWARE HERE
// Each route file handles its own auth
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/payments', paymentRoutes);

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Prisma errors
  if (err.code === 'P2002') {
    const target = err.meta?.target || ['field'];
    const field = target[0] || 'field';
    
    const friendlyMessages = {
      'username': 'Username already taken',
      'officeCode': 'Office code already exists',
      'referenceNumber': 'Reference number already exists'
    };

    const message = friendlyMessages[field] || `${field} already exists`;
    
    return res.status(409).json({
      success: false,
      error: message
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found'
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error: 'Related record not found. Please check your input.'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token. Please login again.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Your session has expired. Please login again.'
    });
  }

  // Validation errors (Joi)
  if (err.isJoi) {
    const errors = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  // Custom business errors with statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  // Invalid credentials
  if (err.message === 'Invalid username or password') {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    });
  }

  // Account inactive
  if (err.message.includes('inactive')) {
    return res.status(401).json({
      success: false,
      error: 'Your account has been deactivated. Please contact administrator.'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: err.message || 'An unexpected error occurred. Please try again later.'
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SmartRent ET Backend is running on port ${PORT}`);
});