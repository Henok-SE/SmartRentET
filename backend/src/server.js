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
const simulationRoutes = require('./simulator/routes/simulationRoutes');
const errorHandler = require('./middleware/errorHandler');
const ApiResponse = require('./utils/apiResponse');

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  return ApiResponse.success(res, {
    data: {
      service: 'SmartRent ET Backend API',
      version: '2.0.0',
      status: 'healthy',
      simulatorMounted: true,
      timestamp: new Date().toISOString()
    },
    message: 'SmartRent ET Backend API is online'
  });
});

// ============================================
// MOUNT CORE API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/payments', paymentRoutes);

// ============================================
// MOUNT PROVIDER SIMULATOR ROUTES
// (Runs seamlessly as one unified service on Render or Local)
// ============================================
app.use('/api/v1', simulationRoutes);

// ============================================
// 404 NOT FOUND HANDLER
// ============================================
app.use((req, res) => {
  return ApiResponse.error(res, {
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND'
  });
});

// ============================================
// CENTRALIZED GLOBAL ERROR HANDLER
// ============================================
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================================`);
  console.log(`🚀 SmartRent ET Backend & Provider Simulator running on port ${PORT}`);
  console.log(`💳 Core API: http://localhost:${PORT}/api/payments`);
  console.log(`🤖 Provider Simulator: http://localhost:${PORT}/api/v1`);
  console.log(`=============================================================`);
});