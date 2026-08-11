const express = require('express');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'SmartRent ET Backend API',
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});