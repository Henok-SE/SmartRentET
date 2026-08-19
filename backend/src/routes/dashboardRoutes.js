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
router.get('/office-admins', dashboardController.getOfficeAdmins);
router.get('/office-summary', dashboardController.getOfficeSummary);
router.get('/offices', dashboardController.getOffices);

router.post('/offices', dashboardController.createOffice);
router.post('/office-admins', dashboardController.createOfficeAdmin);
router.post('/officers', dashboardController.createOfficer);

module.exports = router;