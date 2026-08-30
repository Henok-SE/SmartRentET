const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// ============================================
// ALL ROUTES - Authentication required
// ============================================
router.use(authenticateToken);

// ============================================
// ROUTES - Officers, Office Admins, Super Admins
// ============================================

router.post('/:id/approve', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), approvalController.approveAgreement);
router.post('/:id/reject', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), approvalController.rejectAgreement);
router.get('/:id/history', approvalController.getApprovalHistory);

module.exports = router;