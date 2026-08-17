const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreementController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', authorizeRoles('OFFICER'), agreementController.createAgreement);
router.get('/:id', agreementController.getAgreement);

router.post('/:id/ussd-verify', authorizeRoles('OFFICER'), agreementController.processUSSDVerification);
router.post('/ussd-verify', authorizeRoles('OFFICER'), agreementController.processUSSDVerification);

router.post('/:id/ussd-payment', authorizeRoles('OFFICER'), agreementController.process50BirrPayment);
router.post('/ussd-payment', authorizeRoles('OFFICER'), agreementController.process50BirrPayment);

module.exports = router;