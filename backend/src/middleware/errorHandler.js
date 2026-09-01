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
            'username': 'Username already taken',
            'officeCode': 'Office code already exists',
            'referenceNumber': 'Reference number already exists',
            'payment_provider_transactionReference_key': 'Transaction reference already recorded for this provider'
        };

        const message = friendlyMessages[field] || `${field} already exists`;
        return ApiResponse.error(res, {
            message,
            statusCode: 409,
            code: 'DUPLICATE_RESOURCE_CONFLICT',
            details: { field, target }
        });
    }

    if (err.code === 'P2025') {
        return ApiResponse.error(res, {
            message: 'Requested record was not found in the database',
            statusCode: 404,
            code: 'RESOURCE_NOT_FOUND'
        });
    }

    if (err.code === 'P2003') {
        return ApiResponse.error(res, {
            message: 'Referenced foreign record does not exist or relation constraint failed',
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
            message: err.details?.[0]?.message || 'Input validation failed',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            details
        });
    }

    // 4. JWT Errors
    if (err.name === 'JsonWebTokenError') {
        return ApiResponse.error(res, {
            message: 'Invalid authentication token. Please login again.',
            statusCode: 401,
            code: 'INVALID_TOKEN'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return ApiResponse.error(res, {
            message: 'Your session has expired. Please login again.',
            statusCode: 401,
            code: 'TOKEN_EXPIRED'
        });
    }

    // 5. Common Express/Node Errors
    if (err.type === 'entity.parse.failed') {
        return ApiResponse.error(res, {
            message: 'Malformed JSON payload received',
            statusCode: 400,
            code: 'INVALID_JSON_BODY'
        });
    }

    // 6. Generic Fallback
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected internal server error occurred';

    return ApiResponse.error(res, {
        message,
        statusCode,
        code: err.code || 'INTERNAL_SERVER_ERROR'
    });
};

module.exports = errorHandler;
