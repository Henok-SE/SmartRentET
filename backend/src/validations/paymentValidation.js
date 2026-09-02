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

// Officer payment records query validation schema
const getPaymentRecordsSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10),

    status: Joi.string()
        .valid('PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'FAILED', 'CANCELLED')
        .optional(),

    paymentMethod: Joi.string()
        .valid('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'TELEBIRR', 'CBE')
        .optional(),

    provider: Joi.string()
        .valid('NONE', 'TELEBIRR', 'BANK', 'OTHER')
        .optional(),

    referenceNumber: Joi.string()
        .trim()
        .optional(),

    search: Joi.string()
        .trim()
        .optional(),

    startDate: Joi.date()
        .iso()
        .optional(),

    endDate: Joi.date()
        .iso()
        .optional()
});

module.exports = {
    createPaymentSchema,
    updatePaymentStatusSchema,
    getPaymentRecordsSchema
};