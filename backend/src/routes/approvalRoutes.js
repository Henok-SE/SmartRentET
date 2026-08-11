const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreementController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Approval history / direct approval endpoint
router.post('/:id', authorizeRoles('OFFICER', 'ADMIN'), agreementController.approveOrReject);

module.exports = router;