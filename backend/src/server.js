const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/authRoutes');
const agreementRoutes = require('./routes/agreementRoutes');
const approvalRoutes = require('./routes/approvalRoutes');

app.get('/', (req, res) => {
  res.json({
    message: 'SmartRent ET Backend API'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/approvals', approvalRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});