const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/:id/approve', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), approvalController.approveAgreement);
router.post('/:id/reject', authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN'), approvalController.rejectAgreement);
router.get('/:id/history', approvalController.getApprovalHistory);

module.exports = router;