const paymentServices = require('../services/paymentServices');

const createPayment = async (req, res) => {
    try {
        const { referenceNumber, amount, paymentMethod } = req.body;

        const payment = await paymentServices.createPayment({
            referenceNumber,
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

const getPaymentHistory = async (req, res) => {
    try {
        const { agreementId } = req.params;

        const payments = await paymentService.getPaymentHistory(
            Number(agreementId)
        );

        res.status(200).json({
            success: true,
            payments
        });
    } catch (error) {
        console.error('Get payment history error:', error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = {
    createPayment,
    getPaymentHistory
}