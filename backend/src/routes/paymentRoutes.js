const express = require('express');

const paymentController = require('../controllers/paymentController')

const router = express.Router();

router.post('/', paymentController.createPayment);
router.get('/agreement/:agreementId', paymentController.getPaymentHistory);

module.exports = router;
