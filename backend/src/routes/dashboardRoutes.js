const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/role');

// ============================================
// ALL ROUTES - Authentication required
// ============================================
router.use(authenticateToken);

// ============================================
// READ ROUTES - Officers, Office Admins, Super Admins
// ============================================

router.get('/summary', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getSummary);
router.get('/contracts', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getContracts);
router.get('/audit-logs', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getAuditLogs);
router.get('/reports', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getReports);
router.get('/notifications', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getNotifications);
router.get('/officers', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getOfficers);
router.get('/super-admins', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getSuperAdmins);
router.get('/office-admins', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getOfficeAdmins);
router.get('/office-summary', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getOfficeSummary);
router.get('/offices', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), dashboardController.getOffices);

// ============================================
// WRITE ROUTES - SUPER ADMIN ONLY
// ============================================

router.post('/offices', authorizeRoles('SUPER_ADMIN'), dashboardController.createOffice);
router.post('/office-admins', authorizeRoles('SUPER_ADMIN'), dashboardController.createOfficeAdmin);
router.post('/officers', authorizeRoles('SUPER_ADMIN'), dashboardController.createOfficer);

module.exports = router;