const express = require('express');
const approvalController = require('../controllers/approvalController');
const { authenticate } = require('../middleware/auth');
const { requireOfficerOrAdmin } = require('../middleware/role');

const router = express.Router();

router.use(authenticate);

router.post('/:id/approve', requireOfficerOrAdmin, approvalController.approveAgreement);
router.post('/:id/reject', requireOfficerOrAdmin, approvalController.rejectAgreement);
router.get('/:id/history', approvalController.getApprovalHistory);

module.exports = router;