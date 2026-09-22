/**
 * Finura Centralized Error Middleware & API Response Formatter
 * Standardizes API responses and provides explicit HTTP status codes for
 * Mongoose CastErrors, duplicate key errors, JWT expiration, and validation failures.
 */

/**
 * 404 Not Found handler for undefined API routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`API endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized error handler
 * Formats all errors into { success: false, message: string, errors?: array }
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let errors;

  // 1. Mongoose Bad ObjectId / CastError
  if (err.name === 'CastError') {
    message = `Resource not found with id: ${err.value}`;
    statusCode = 404;
    errorCode = 'RESOURCE_NOT_FOUND';
  }

  // 2. Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    const duplicateKey = fields.join(', ');
    message = duplicateKey
      ? `Duplicate value entered for field: ${duplicateKey}. Please choose another value.`
      : 'Duplicate entry detected';
    statusCode = 400;
    errorCode = 'DUPLICATE_RESOURCE';
  }

  // 3. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    message = 'Validation failed';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  }

  // 4. JWT Token Expiration
  if (err.name === 'TokenExpiredError') {
    message = 'Authorization token has expired. Please log in again.';
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
  }

  // 5. JWT Malformed / Signature Error
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid authorization token. Access denied.';
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
  }

  // Handle custom errors array if provided
  if (err.errors && !errors && Array.isArray(err.errors)) {
    errors = err.errors;
  }

  // Custom status code attached to error object
  if (err.statusCode && typeof err.statusCode === 'number') {
    statusCode = err.statusCode;
  }

  if (statusCode >= 500 && process.env.NODE_ENV !== 'development') {
    message = 'Internal server error';
    errorCode = 'INTERNAL_SERVER_ERROR';
  }

  const response = {
    success: false,
    message,
    errorCode,
    ...(errors && errors.length > 0 ? { errors } : {}),
  };

  // Include stack trace only in development environment
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standardized success response formatter helper
 * Contract: { success: true, data: ..., message?: string }
 */
const sendSuccess = (res, data, statusCode = 200, message = null) => {
  const payload = {
    success: true,
    ...(message ? { message } : {}),
    data,
  };
  return res.status(statusCode).json(payload);
};

module.exports = {
  notFound,
  errorHandler,
  sendSuccess,
};
