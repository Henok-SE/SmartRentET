const Joi = require('joi');

// Payment creation validation schema
const createPaymentSchema = Joi.object({
    referenceNumber: Joi.string()
        .trim()
        .required(),

    amount: Joi.number()
        .positive()
        .required(),

    paymentMethod: Joi.string()
        .valid('TELEBIRR', 'CBE', 'STARPAY')
        .required(),

    customerName: Joi.string()
        .trim()
        .optional(),

    customerPhoneNumber: Joi.string()
        .trim()
        .pattern(/^(09|07)\d{8}$/)
        .optional(),

    dueDate: Joi.date()
        .iso()
        .optional()
});

// Payment status update validation schema
const updatePaymentStatusSchema = Joi.object({
    status: Joi.string()
        .valid('PENDING', 'PAID', 'FAILED', 'CANCELLED')
        .required(),

    transactionReference: Joi.string()
        .trim()
        .when('status', {
            is: 'PAID',
            then: Joi.required(),
            otherwise: Joi.optional()
        })
});

module.exports = {
    createPaymentSchema,
    updatePaymentStatusSchema
};