const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreementController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', authorizeRoles('OFFICER', 'SYSTEM_ADMIN', 'ADMIN'), agreementController.createAgreement);
router.get('/:id', agreementController.getAgreement);

// Process USSD verification code
router.post('/:id/ussd-verify', authorizeRoles('OFFICER', 'SYSTEM_ADMIN', 'ADMIN'), agreementController.processUSSDVerification);
router.post('/ussd-verify', authorizeRoles('OFFICER', 'SYSTEM_ADMIN', 'ADMIN'), agreementController.processUSSDVerification);

// Process 50 Birr government payment
router.post('/:id/ussd-payment', authorizeRoles('OFFICER', 'SYSTEM_ADMIN', 'ADMIN'), agreementController.process50BirrPayment);
router.post('/ussd-payment', authorizeRoles('OFFICER', 'SYSTEM_ADMIN', 'ADMIN'), agreementController.process50BirrPayment);

module.exports = router;