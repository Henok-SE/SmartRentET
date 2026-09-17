const toFriendlyFieldName = (path) => {
  const raw = Array.isArray(path) ? path.join('.') : String(path || 'field');

  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .split('.')
    .pop()
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/\bId\b/gi, 'ID')
    .replace(/\bOtp\b/gi, 'OTP')
    .replace(/\bPhone\b/gi, 'Phone')
    .replace(/\bEmail\b/gi, 'Email');
};

const cleanJoiMessage = (detail) => {
  const fieldLabel = toFriendlyFieldName(detail.path);
  const rawMessage = detail.message || 'This value is invalid.';

  return rawMessage
    .replace(/"[^"]+"/g, fieldLabel)
    .replace(/\bmust be\b/gi, 'must be')
    .replace(/\bcontains\b/gi, 'contains')
    .replace(/\bvalue\b/gi, 'value');
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: cleanJoiMessage(detail)
      }));

      return res.status(400).json({
        success: false,
        message: 'Please check the form and try again.',
        errors
      });
    }

    req.body = value;
    next();
  };
};

module.exports = { validate };