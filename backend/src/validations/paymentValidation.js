const Joi = require('joi');

const createPaymentSchema = Joi.object({
    referenceNumber: Joi.string()
        .trim()
        .required(),

    amount: Joi.number()
        .positive()
        .required(),

    paymentMethod: Joi.string()
        .valid('TELEBIRR', 'CBE')
        .required(),

    customerName: Joi.string()
        .trim()
        .required(),

    customerPhoneNumber: Joi.string()
        .trim()
        .required(),

    dueDate: Joi.date()
        .iso()
        .optional(),

    mode: Joi.string()
        .valid('SUCCESS', 'FAILED', 'TIMEOUT', 'DUPLICATE')
        .optional(),

    delayMs: Joi.number()
        .integer()
        .min(0)
        .max(60000)
        .optional()
});

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