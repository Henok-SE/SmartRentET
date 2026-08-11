const express = require('express');
const agreementController = require('../controllers/agreementController');
const { authenticate } = require('../middleware/auth');
const { requireOfficerOrAdmin } = require('../middleware/role');

const router = express.Router();

router.use(authenticate);

router.post('/', requireOfficerOrAdmin, agreementController.createAgreement);
router.get('/', agreementController.getMyAgreements);
router.get('/:id', agreementController.getAgreement);

module.exports = router;