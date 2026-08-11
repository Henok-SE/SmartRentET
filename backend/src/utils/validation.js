const validateRequiredFields = (data, requiredFields) => {
  const missing = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      message: 'Missing required fields: ' + missing.join(', ')
    };
  }

  return { valid: true };
};

const isValidPhone = (phone) => {
  const phoneRegex = /^(09|07)\d{8}$/;
  return phoneRegex.test(phone);
};

const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

const isValidNationalId = (id) => {
  return id && id.length >= 5;
};

module.exports = {
  validateRequiredFields,
  isValidPhone,
  isValidUsername,
  isValidNationalId
};