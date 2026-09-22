/**
 * Finura Request Validation Layer
 * Express-validator schemas for authentication, user profiles, and financial transactions.
 */

const { body, validationResult } = require('express-validator');

/**
 * Middleware to evaluate validation rules and format standardized 400 error response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: formattedErrors[0]?.message || 'Validation failed',
      errors: formattedErrors,
    });
  }
  next();
};

/**
 * Auth: User Registration / Signup Validation
 */
const validateRegister = [
  body('name')
    .custom((value, { req }) => {
      const nameVal = value || req.body.fullName;
      if (!nameVal || typeof nameVal !== 'string' || !nameVal.trim()) {
        throw new Error('Name is required');
      }
      if (nameVal.trim().length < 2 || nameVal.trim().length > 100) {
        throw new Error('Name must be between 2 and 100 characters');
      }
      return true;
    }),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors,
];

/**
 * Auth: User Login Validation
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

/**
 * User: Profile Update Validation
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/)
    .withMessage('Please provide a valid phone format (e.g., +1-555-019-2834)'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('profession')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Profession cannot exceed 100 characters'),
  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Occupation cannot exceed 100 characters'),
  handleValidationErrors,
];

/**
 * Transaction: Creation & Update Validation
 */
const validateTransaction = [
  body('amount')
    .notEmpty()
    .withMessage('Transaction amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Transaction amount must be a positive number greater than 0'),
  body('type')
    .notEmpty()
    .withMessage('Transaction type is required')
    .isIn(['income', 'expense', 'investment'])
    .withMessage('Type must be income, expense, or investment'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date string'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateSignup: validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateTransaction,
};
