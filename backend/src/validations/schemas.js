const Joi = require('joi');

const phonePattern = /^(09|07)\d{8}$/;
const nationalIdPattern = /^\d{16}$/;
const otpPattern = /^\d{6}$/;

const baseMessages = {
  'string.empty': '{#label} is required.',
  'string.required': '{#label} is required.',
  'string.min': '{#label} must be at least {#limit} characters long.',
  'string.max': '{#label} must be at most {#limit} characters long.',
  'string.email': 'Please enter a valid email address.',
  'string.pattern.base': '{#label} format is invalid.',
  'string.length': '{#label} must be exactly {#limit} characters long.',
  'number.base': '{#label} must be a valid number.',
  'number.integer': '{#label} must be a whole number.',
  'number.min': '{#label} must be at least {#limit}.',
  'number.positive': '{#label} must be greater than 0.',
  'boolean.base': '{#label} must be true or false.',
  'any.only': '{#label} must be one of: {#valids}.',
  'date.base': '{#label} must be a valid date.',
  'any.required': '{#label} is required.'
};

const phoneSchema = Joi.string().pattern(phonePattern).messages({
  'string.empty': 'Phone number is required.',
  'string.pattern.base': 'Phone number must start with 09 or 07 and contain 10 digits.'
});

const nationalIdSchema = Joi.string().pattern(nationalIdPattern).messages({
  'string.empty': 'National ID is required.',
  'string.pattern.base': 'National ID must be exactly 16 digits.'
});

const otpSchema = Joi.string().length(6).pattern(otpPattern).messages({
  'string.empty': 'OTP code is required.',
  'string.length': 'OTP code must be exactly 6 digits.',
  'string.pattern.base': 'OTP code must contain only numbers.'
});

// ============================================
// AUTH SCHEMAS
// ============================================

const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(50).messages(baseMessages),
  password: Joi.string().required().min(6).messages(baseMessages)
});

const registerSchema = Joi.object({
  firstName: Joi.string().required().min(2).max(50).messages(baseMessages),
  lastName: Joi.string().required().min(2).max(50).messages(baseMessages),
  phone: phoneSchema.required(),
  nationalId: nationalIdSchema.optional(),
  email: Joi.string().email().optional().messages(baseMessages),
  role: Joi.string().valid('SUPER_ADMIN', 'OFFICE_ADMIN', 'OFFICER').required().messages(baseMessages),
  profileData: Joi.object({
    officeId: Joi.string().optional().messages(baseMessages),
    employeeId: Joi.string().optional().messages(baseMessages),
    position: Joi.string().optional().messages(baseMessages),
    assignedArea: Joi.string().optional().messages(baseMessages)
  }).optional()
});

const verifyOTPSchema = Joi.object({
  userId: Joi.string().required().uuid().messages(baseMessages),
  code: otpSchema.required()
});

const changePasswordSchema = Joi.object({
  userId: Joi.string().required().uuid().messages(baseMessages),
  currentPassword: Joi.string().required().min(6).messages(baseMessages),
  newPassword: Joi.string().required().min(6).messages(baseMessages)
});

// ============================================
// USER MANAGEMENT SCHEMAS
// ============================================

const createOfficeAdminSchema = Joi.object({
  firstName: Joi.string().required().min(2).max(50).messages(baseMessages),
  lastName: Joi.string().required().min(2).max(50).messages(baseMessages),
  username: Joi.string().required().min(3).max(50).messages(baseMessages),
  phone: phoneSchema.required(),
  nationalId: nationalIdSchema.optional(),
  email: Joi.string().email().optional().messages(baseMessages),
  employeeId: Joi.string().required().messages(baseMessages),
  officeId: Joi.string().required().messages(baseMessages)
});

const createOfficerSchema = Joi.object({
  firstName: Joi.string().required().min(2).max(50).messages(baseMessages),
  lastName: Joi.string().required().min(2).max(50).messages(baseMessages),
  username: Joi.string().required().min(3).max(50).messages(baseMessages),
  phone: phoneSchema.required(),
  nationalId: nationalIdSchema.optional(),
  email: Joi.string().email().optional().messages(baseMessages),
  employeeId: Joi.string().required().messages(baseMessages),
  officeId: Joi.string().required().messages(baseMessages),
  position: Joi.string().optional().messages(baseMessages),
  assignedArea: Joi.string().optional().messages(baseMessages)
});

const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean().required().messages(baseMessages)
});

// ============================================
// NATIONAL ID VERIFICATION SCHEMAS
// ============================================

const verifyNationalIdSchema = Joi.object({
  userId: Joi.string().required().uuid().messages(baseMessages),
  code: otpSchema.required()
});

const sendNationalIdSchema = Joi.object({
  userId: Joi.string().required().uuid().messages(baseMessages)
});

// ============================================
// AGREEMENT SCHEMAS
// ============================================

const createAgreementSchema = Joi.object({
  // Landlord
  landlordFirstName: Joi.string().required().min(2).max(50).messages(baseMessages),
  landlordLastName: Joi.string().required().min(2).max(50).messages(baseMessages),
  landlordPhone: phoneSchema.required(),
  landlordNationalId: nationalIdSchema.required(),
  landlordAddress: Joi.string().optional().messages(baseMessages),
  landlordSubCity: Joi.string().optional().messages(baseMessages),
  landlordWoreda: Joi.string().optional().messages(baseMessages),
  landlordHouseNumber: Joi.string().optional().messages(baseMessages),
  landlordBusinessLicense: Joi.string().optional().messages(baseMessages),
  landlordBankAccount: Joi.string().optional().messages(baseMessages),

  // Tenant
  tenantFirstName: Joi.string().required().min(2).max(50).messages(baseMessages),
  tenantLastName: Joi.string().required().min(2).max(50).messages(baseMessages),
  tenantPhone: phoneSchema.required(),
  tenantNationalId: nationalIdSchema.required(),
  tenantAddress: Joi.string().optional().messages(baseMessages),
  tenantSubCity: Joi.string().optional().messages(baseMessages),
  tenantWoreda: Joi.string().optional().messages(baseMessages),
  tenantHouseNumber: Joi.string().optional().messages(baseMessages),
  tenantEmergencyContactName: Joi.string().optional().messages(baseMessages),
  tenantEmergencyContactPhone: Joi.string().optional().messages(baseMessages),
  tenantEmployer: Joi.string().optional().messages(baseMessages),

  // Property
  propertyLocation: Joi.string().required().messages(baseMessages),
  propertySubCity: Joi.string().required().messages(baseMessages),
  propertyWoreda: Joi.string().required().messages(baseMessages),
  propertyHouseNumber: Joi.string().required().messages(baseMessages),
  propertyType: Joi.string().valid('RESIDENTIAL', 'COMMERCIAL').default('RESIDENTIAL').messages(baseMessages),
  numberOfUnits: Joi.number().integer().min(1).default(1).messages(baseMessages),

  // Unit
  unitNumber: Joi.string().required().messages(baseMessages),
  unitFloor: Joi.number().integer().optional().messages(baseMessages),
  unitSizeSqMeters: Joi.number().positive().optional().messages(baseMessages),
  unitBedrooms: Joi.number().integer().min(0).optional().messages(baseMessages),
  unitBathrooms: Joi.number().integer().min(0).optional().messages(baseMessages),
  unitRentAmountFloor: Joi.number().positive().optional().messages(baseMessages),

  // House Details
  houseType: Joi.string().optional().messages(baseMessages),
  houseNumber: Joi.string().optional().messages(baseMessages),
  numberOfRooms: Joi.number().integer().min(0).optional().messages(baseMessages),
  numberOfBathrooms: Joi.number().integer().min(0).optional().messages(baseMessages),
  numberOfDoors: Joi.number().integer().min(0).optional().messages(baseMessages),
  numberOfWindows: Joi.number().integer().min(0).optional().messages(baseMessages),
  houseItems: Joi.string().optional().messages(baseMessages),

  // Agreement Terms
  durationValue: Joi.number().integer().min(1).default(12).messages(baseMessages),
  durationUnit: Joi.string().valid('MONTH', 'YEAR').default('MONTH').messages(baseMessages),
  effectiveDate: Joi.date().required().messages(baseMessages),
  terminationDate: Joi.date().optional().messages(baseMessages),
  rentalAmount: Joi.number().positive().required().messages(baseMessages),
  paymentTerms: Joi.string().optional().messages(baseMessages),
  advancePayment: Joi.number().min(0).default(0).messages(baseMessages),
  paymentFrequencyName: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY').default('MONTHLY').messages(baseMessages),
  notes: Joi.string().optional().messages(baseMessages)
});

const verifyCodeSchema = Joi.object({
  agreementId: Joi.string().required().uuid().messages(baseMessages),
  phone: phoneSchema.required(),
  code: otpSchema.required()
});

const paymentSchema = Joi.object({
  agreementId: Joi.string().required().uuid().messages(baseMessages),
  phone: phoneSchema.required(),
  pin: Joi.string().required().length(4).pattern(/^\d{4}$/).messages({
    'string.empty': 'PIN is required.',
    'string.length': 'PIN must be exactly 4 digits.',
    'string.pattern.base': 'PIN must contain only numbers.'
  })
});

// ============================================
// OFFICE SCHEMAS
// ============================================

const createOfficeSchema = Joi.object({
  officeName: Joi.string().required().min(2).max(100).messages(baseMessages),
  officeCode: Joi.string().required().min(2).max(20).messages(baseMessages),
  region: Joi.string().required().messages(baseMessages),
  city: Joi.string().required().messages(baseMessages),
  subCity: Joi.string().optional().messages(baseMessages),
  woreda: Joi.string().optional().messages(baseMessages),
  address: Joi.string().optional().messages(baseMessages)
});

// ============================================
// PAYMENT SCHEMAS
// ============================================

const createPaymentSchema = Joi.object({
  referenceNumber: Joi.string().required().messages(baseMessages),
  amount: Joi.number().positive().required().messages(baseMessages),
  paymentMethod: Joi.string().valid('TELEBIRR', 'CBE', 'STARPAY').required().messages(baseMessages),
  customerName: Joi.string().optional().messages(baseMessages),
  customerPhoneNumber: Joi.string().optional().pattern(phonePattern).messages({
    'string.empty': 'Customer phone number is required.',
    'string.pattern.base': 'Customer phone number must start with 09 or 07 and contain 10 digits.'
  })
});

const updatePaymentStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'PAID', 'FAILED', 'CANCELLED').required().messages(baseMessages),
  transactionReference: Joi.string().optional().messages(baseMessages)
});

// ============================================
// DASHBOARD SCHEMAS
// ============================================

const getContractsSchema = Joi.object({
  referenceNumber: Joi.string().optional().messages(baseMessages),
  status: Joi.string().valid('DRAFT', 'PENDING_VERIFICATION', 'PENDING_SERVICE_FEE', 'APPROVED', 'REJECTED', 'ACTIVE', 'TERMINATED', 'EXPIRED').optional().messages(baseMessages),
  subCity: Joi.string().optional().messages(baseMessages),
  landlord: Joi.string().optional().messages(baseMessages),
  tenant: Joi.string().optional().messages(baseMessages)
});

const getAuditLogsSchema = Joi.object({
  action: Joi.string().optional().messages(baseMessages),
  userId: Joi.string().uuid().optional().messages(baseMessages),
  startDate: Joi.date().optional().messages(baseMessages),
  endDate: Joi.date().optional().messages(baseMessages)
});

const getReportsSchema = Joi.object({
  subCity: Joi.string().optional().messages(baseMessages),
  startDate: Joi.date().optional().messages(baseMessages),
  endDate: Joi.date().optional().messages(baseMessages)
});

const getNotificationsSchema = Joi.object({
  userId: Joi.string().uuid().required().messages(baseMessages),
  isRead: Joi.boolean().optional().messages(baseMessages)
});

const getOfficersSchema = Joi.object({
  subCity: Joi.string().optional().messages(baseMessages),
  isActive: Joi.boolean().optional().messages(baseMessages)
});

const getOfficeAdminsSchema = Joi.object({
  officeId: Joi.string().uuid().optional().messages(baseMessages),
  subCity: Joi.string().optional().messages(baseMessages),
  isActive: Joi.boolean().optional().messages(baseMessages),
  officeCode: Joi.string().optional().messages(baseMessages)
});

const getOfficeSummarySchema = Joi.object({
  officeId: Joi.string().uuid().optional().messages(baseMessages),
  subCity: Joi.string().optional().messages(baseMessages)
});

const getOfficesSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional().messages(baseMessages),
  subCity: Joi.string().optional().messages(baseMessages),
  city: Joi.string().optional().messages(baseMessages)
});

// ============================================
// APPROVAL SCHEMAS
// ============================================

const approveAgreementSchema = Joi.object({
  comments: Joi.string().optional().messages(baseMessages)
});

const rejectAgreementSchema = Joi.object({
  comments: Joi.string().required().messages(baseMessages)
});

// ============================================
// EXPORT ALL SCHEMAS
// ============================================

module.exports = {
  // Auth
  loginSchema,
  registerSchema,
  verifyOTPSchema,
  changePasswordSchema,

  // User Management
  createOfficeAdminSchema,
  createOfficerSchema,
  updateUserStatusSchema,

  // National ID Verification
  verifyNationalIdSchema,
  sendNationalIdSchema,

  // Agreement
  createAgreementSchema,
  verifyCodeSchema,
  paymentSchema,

  // Office
  createOfficeSchema,

  // Payment
  createPaymentSchema,
  updatePaymentStatusSchema,

  // Dashboard
  getContractsSchema,
  getAuditLogsSchema,
  getReportsSchema,
  getNotificationsSchema,
  getOfficersSchema,
  getOfficeAdminsSchema,
  getOfficeSummarySchema,
  getOfficesSchema,

  // Approval
  approveAgreementSchema,
  rejectAgreementSchema
};