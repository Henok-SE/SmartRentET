const express = require('express');
const approvalController = require('../controllers/approvalController');
const { authenticate } = require('../middleware/auth');
const { requireOfficerOrAdmin } = require('../middleware/role');

const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticate);

router.post('/:id/approve', authorizeRoles('OFFICER'), approvalController.approveAgreement);
router.post('/:id/reject', authorizeRoles('OFFICER'), approvalController.rejectAgreement);
router.get('/:id/history', approvalController.getApprovalHistory);

module.exports = router;