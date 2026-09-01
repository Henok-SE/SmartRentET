/**
 * Custom Operational Error Hierarchy for SmartRent ET
 */

class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad request', code = 'BAD_REQUEST', details = null) {
        super(message, 400, code, details);
    }
}

class ValidationError extends AppError {
    constructor(message = 'Validation failed', details = null) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access', code = 'UNAUTHORIZED') {
        super(message, 401, code);
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden', code = 'FORBIDDEN') {
        super(message, 403, code);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found', code = 'RESOURCE_NOT_FOUND') {
        super(message, 404, code);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict', code = 'CONFLICT') {
        super(message, 409, code);
    }
}

class PaymentError extends AppError {
    constructor(message = 'Payment processing error', code = 'PAYMENT_ERROR', details = null) {
        super(message, 422, code, details);
    }
}

module.exports = {
    AppError,
    BadRequestError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    PaymentError
};
