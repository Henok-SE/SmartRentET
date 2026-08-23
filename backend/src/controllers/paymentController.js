const paymentServices = require('../services/paymentServices');

const createPayment = async (req, res) => {
    try {
        const { contractReference, amount, paymentMethod } = req.body;

        const payment = await paymentServices.createPayment({
            contractReference,
            amount,
            paymentMethod
        });

        res.status(201).json({
            success: true,
            message: 'Payment request received',
            payment: {
                contractReference,
                amount,
                paymentMethod
            }
        });
    } catch (error) {
        console.error('create payment error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create payment'
        });
    }
};

module.exports = {
    createPayment
}