const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/summary', dashboardController.getSummary);
router.get('/contracts', dashboardController.getContracts);
router.get('/audit-logs', dashboardController.getAuditLogs);

module.exports = router;