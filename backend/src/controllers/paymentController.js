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
            payment
        });
    } catch (error) {
        console.error('create payment error:', error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createPayment
}