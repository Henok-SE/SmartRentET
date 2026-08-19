const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const cors = require('cors');
const dashboardRoutes = require('./routes/dashboardRoutes');


const app = express();
const PORT = process.env.PORT || 5000;

// =============================================
// MIDDLEWARE - MUST BE IN THIS ORDER
// =============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/authRoutes');
const agreementRoutes = require('./routes/agreementRoutes');
const approvalRoutes = require('./routes/approvalRoutes');

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'SmartRent ET Backend API',
    version: '2.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SmartRent ET Backend is running on port ${PORT}`);
});

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`Test login: POST http://localhost:${PORT}/api/auth/login`);
// });