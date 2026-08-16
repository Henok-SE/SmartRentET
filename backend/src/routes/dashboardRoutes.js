const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/summary', dashboardController.getSummary);
router.get('/contracts', dashboardController.getContracts);
router.get('/audit-logs', dashboardController.getAuditLogs);
router.get('/reports', dashboardController.getReports);
router.get('/notifications', dashboardController.getNotifications);
router.get('/officers', dashboardController.getOfficers);
router.get('/super-admins', dashboardController.getSuperAdmins);

module.exports = router;