const ApiResponse = require('../utils/apiResponse');
const { AppError } = require('../utils/errors');

/**
 * Global Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log in development or if unexpected internal error
    if (process.env.NODE_ENV !== 'test') {
        console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);
        if (!err.isOperational) {
            console.error(err.stack);
        }
    }

    // 1. Custom Operational AppErrors
    if (err instanceof AppError || err.isOperational) {
        return ApiResponse.error(res, {
            message: err.message,
            statusCode: err.statusCode || 500,
            code: err.code || 'OPERATIONAL_ERROR',
            details: err.details
        });
    }

    // 2. Prisma Database Errors
    if (err.code === 'P2002') {
        const target = err.meta?.target || ['field'];
        const field = Array.isArray(target) ? target[0] : target;

        const friendlyMessages = {
            username: 'This username is already in use.',
            officeCode: 'This office code is already in use.',
            referenceNumber: 'This reference number has already been used.',
            payment_provider_transactionReference_key: 'This payment reference was already recorded.'
        };

        const message = friendlyMessages[field] || 'This information is already in use.';
        return ApiResponse.error(res, {
            message,
            statusCode: 409,
            code: 'DUPLICATE_RESOURCE_CONFLICT',
            details: { field, target }
        });
    }

    if (err.code === 'P2025') {
        return ApiResponse.error(res, {
            message: 'The requested record could not be found.',
            statusCode: 404,
            code: 'RESOURCE_NOT_FOUND'
        });
    }

    if (err.code === 'P2003') {
        return ApiResponse.error(res, {
            message: 'The selected record is linked to something that cannot be changed right now.',
            statusCode: 400,
            code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION'
        });
    }

    // 3. Joi Validation Errors
    if (err.isJoi) {
        const details = err.details?.map(d => ({
            field: d.path.join('.'),
            message: d.message
        })) || [];

        return ApiResponse.error(res, {
            message: err.details?.[0]?.message || 'Please check your information and try again.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            details
        });
    }

    // 4. JWT Errors
    if (err.name === 'JsonWebTokenError') {
        return ApiResponse.error(res, {
            message: 'Your login session is invalid. Please sign in again.',
            statusCode: 401,
            code: 'INVALID_TOKEN'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return ApiResponse.error(res, {
            message: 'Your session has expired. Please sign in again.',
            statusCode: 401,
            code: 'TOKEN_EXPIRED'
        });
    }

    // 5. Common Express/Node Errors
    if (err.type === 'entity.parse.failed') {
        return ApiResponse.error(res, {
            message: 'The information you sent is not in the correct format.',
            statusCode: 400,
            code: 'INVALID_JSON_BODY'
        });
    }

    // 6. Generic Fallback
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Something went wrong. Please try again later.';

    return ApiResponse.error(res, {
        message,
        statusCode,
        code: err.code || 'INTERNAL_SERVER_ERROR'
    });
};

module.exports = errorHandler;
