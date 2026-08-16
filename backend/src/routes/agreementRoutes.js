const express = require('express');
const agreementController = require('../controllers/agreementController');
const { authenticate } = require('../middleware/auth');
const { requireOfficerOrAdmin } = require('../middleware/role');

router.use(authenticateToken);

router.post('/', authorizeRoles('OFFICER'), agreementController.createAgreement);
router.get('/:id', agreementController.getAgreement);

router.post('/:id/ussd-consent', authorizeRoles('OFFICER'), agreementController.processUSSDConsent);
router.post('/:id/ussd-payment', authorizeRoles('OFFICER'), agreementController.process50BirrPayment);

module.exports = router;