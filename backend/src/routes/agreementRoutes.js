const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreementController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// All agreement routes require authentication
router.use(authenticateToken);

router.post('/', authorizeRoles('LANDLORD', 'TENANT', 'ADMIN'), agreementController.create);
router.get('/', agreementController.getAll);
router.get('/:id', agreementController.getById);

// Officer approval endpoint
router.post('/:id/approve', authorizeRoles('OFFICER', 'ADMIN'), agreementController.approveOrReject);

module.exports = router;