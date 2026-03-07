/**
 * Validation utility for checking required fields in API requests
 */

/**
 * Validates that all required fields are present in the request body
 * @param {Object} body - Request body to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} - { isValid: boolean, missingFields: Array<string> }
 */
const validateRequiredFields = (body, requiredFields) => {
  const missingFields = [];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Formats field name for user-friendly error messages
 * Converts snake_case or camelCase to Title Case with spaces
 * @param {string} field - Field name to format
 * @returns {string} - Formatted field name
 */
const formatFieldName = (field) => {
  return field
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Creates a validation error response
 * @param {Array<string>} missingFields - Array of missing field names
 * @returns {Object} - Error response object
 */
const createValidationError = (missingFields) => {
  const formattedFields = missingFields.map(formatFieldName);

  return {
    error: 'Validation Error',
    message: `The following required fields are missing: ${formattedFields.join(', ')}`,
    missingFields: missingFields,
    details: formattedFields.map(field => `${field} is required`)
  };
};

/**
 * Middleware factory for validating required fields
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Function} - Express middleware function
 */
const validateFields = (requiredFields) => {
  return (req, res, next) => {
    const validation = validateRequiredFields(req.body, requiredFields);

    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    next();
  };
};

module.exports = {
  validateRequiredFields,
  formatFieldName,
  createValidationError,
  validateFields
};
