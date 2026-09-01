/**
 * Standardized API Response Formatter for SmartRent ET
 */

class ApiResponse {
    /**
     * Send standard success response
     * @param {object} res - Express response object
     * @param {object} options
     * @param {any} options.data - Payload data
     * @param {string} options.message - Human-friendly message
     * @param {number} options.statusCode - HTTP Status Code (default 200)
     * @param {object} options.meta - Pagination or extra metadata
     */
    static success(res, { data = null, message = 'Success', statusCode = 200, meta = null, isDuplicate = undefined } = {}) {
        const responsePayload = {
            success: true,
            message,
            data
        };

        if (meta) {
            responsePayload.meta = meta;
        }

        if (isDuplicate !== undefined) {
            responsePayload.isDuplicate = isDuplicate;
        }

        return res.status(statusCode).json(responsePayload);
    }

    /**
     * Send standard error response
     * @param {object} res - Express response object
     * @param {object} options
     * @param {string} options.message - Error message
     * @param {number} options.statusCode - HTTP Status Code (default 500)
     * @param {string} options.code - Machine-readable error code
     * @param {any} options.details - Optional validation or error details
     */
    static error(res, { message = 'An unexpected error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = null } = {}) {
        const responsePayload = {
            success: false,
            error: message, // Top-level string for client backward compatibility
            errorDetails: {
                code,
                message,
                ...(details ? { details } : {})
            },
            timestamp: new Date().toISOString()
        };

        return res.status(statusCode).json(responsePayload);
    }
}

module.exports = ApiResponse;
