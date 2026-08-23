const express = require('express');

const paymentController = require('../controllers/paymentController')

const router = express.Router();

router.post('/', paymentController.createPayment);

module.exports = router;
