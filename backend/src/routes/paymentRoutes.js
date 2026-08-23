const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
    const { contractReference, amount, paymentMethod } = req.body;

    res.status(201).json(
        {
            success: true,
            message: 'Payment request received',
            payment: {
                contractReference,
                amount,
                paymentMethod
            }
        });
});

module.exports = router;
