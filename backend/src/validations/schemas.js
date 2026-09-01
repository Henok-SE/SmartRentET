const Joi = require('joi');

// ============================================
// AUTH SCHEMAS
// ============================================

const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  password: Joi.string().required().min(6)
});

const registerSchema = Joi.object({
  firstName: Joi.string().required().min(2).max(50),
  lastName: Joi.string().required().min(2).max(50),
  phone: Joi.string().required().pattern(/^(09|07)\d{8}$/),
  nationalId: Joi.string().optional().pattern(/^\d{16}$/),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('SUPER_ADMIN', 'OFFICE_ADMIN', 'OFFICER').required(),
  profileData: Joi.object({
    officeId: Joi.string().optional(),
    employeeId: Joi.string().optional(),
    position: Joi.string().optional(),
    assignedArea: Joi.string().optional()
  }).optional()
});

const verifyOTPSchema = Joi.object({
  userId: Joi.string().required().uuid(),
  code: Joi.string().required().length(6).pattern(/^\d{6}$/)
});

const changePasswordSchema = Joi.object({
  userId: Joi.string().required().uuid(),
  currentPassword: Joi.string().required().min(6),
  newPassword: Joi.string().required().min(6)
});

// ============================================
// USER MANAGEMENT SCHEMAS
// ============================================

const createOfficeAdminSchema = Joi.object({
  firstName: Joi.string().required().min(2).max(50),
  lastName: Joi.string().required().min(2).max(50),
  username: Joi.string().required().min(3).max(50),
  phone: Joi.string().required().pattern(/^(09|07)\d{8}$/),
  nationalId: Joi.string().optional().pattern(/^\d{16}$/),
  email: Joi.string().email().optional(),
  employeeId: Joi.string().required(),
  officeId: Joi.string().required()
});

const createOfficerSchema = Joi.object({
  firstName: Joi.string().required().min(2).max(50),
  lastName: Joi.string().required().min(2).max(50),
  username: Joi.string().required().min(3).max(50),
  phone: Joi.string().required().pattern(/^(09|07)\d{8}$/),
  nationalId: Joi.string().optional().pattern(/^\d{16}$/),
  email: Joi.string().email().optional(),
  employeeId: Joi.string().required(),
  officeId: Joi.string().required(),
  position: Joi.string().optional(),
  assignedArea: Joi.string().optional()
});

const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean().required()
});

// ============================================
// NATIONAL ID VERIFICATION SCHEMAS
// ============================================

const verifyNationalIdSchema = Joi.object({
  userId: Joi.string().required().uuid(),
  code: Joi.string().required().length(6).pattern(/^\d{6}$/)
});

const sendNationalIdSchema = Joi.object({
  userId: Joi.string().required().uuid()
});

// ============================================
// AGREEMENT SCHEMAS
// ============================================

const createAgreementSchema = Joi.object({
  // Landlord
  landlordFirstName: Joi.string().required().min(2).max(50),
  landlordLastName: Joi.string().required().min(2).max(50),
  landlordPhone: Joi.string().required().pattern(/^(09|07)\d{8}$/),
  landlordNationalId: Joi.string().required().pattern(/^\d{16}$/),
  landlordAddress: Joi.string().optional(),
  landlordSubCity: Joi.string().optional(),
  landlordWoreda: Joi.string().optional(),
  landlordHouseNumber: Joi.string().optional(),
  landlordBusinessLicense: Joi.string().optional(),
  landlordBankAccount: Joi.string().optional(),

  // Tenant
  tenantFirstName: Joi.string().required().min(2).max(50),
  tenantLastName: Joi.string().required().min(2).max(50),
  tenantPhone: Joi.string().required().pattern(/^(09|07)\d{8}$/),
  tenantNationalId: Joi.string().required().pattern(/^\d{16}$/),
  tenantAddress: Joi.string().optional(),
  tenantSubCity: Joi.string().optional(),
  tenantWoreda: Joi.string().optional(),
  tenantHouseNumber: Joi.string().optional(),
  tenantEmergencyContactName: Joi.string().optional(),
  tenantEmergencyContactPhone: Joi.string().optional(),
  tenantEmployer: Joi.string().optional(),

  // Property
  propertyLocation: Joi.string().required(),
  propertySubCity: Joi.string().required(),
  propertyWoreda: Joi.string().required(),
  propertyHouseNumber: Joi.string().required(),
  propertyType: Joi.string().valid('RESIDENTIAL', 'COMMERCIAL').default('RESIDENTIAL'),
  numberOfUnits: Joi.number().integer().min(1).default(1),

  // Unit
  unitNumber: Joi.string().required(),
  unitFloor: Joi.number().integer().optional(),
  unitSizeSqMeters: Joi.number().positive().optional(),
  unitBedrooms: Joi.number().integer().min(0).optional(),
  unitBathrooms: Joi.number().integer().min(0).optional(),
  unitRentAmountFloor: Joi.number().positive().optional(),

  // House Details
  houseType: Joi.string().optional(),
  houseNumber: Joi.string().optional(),
  numberOfRooms: Joi.number().integer().min(0).optional(),
  numberOfBathrooms: Joi.number().integer().min(0).optional(),
  numberOfDoors: Joi.number().integer().min(0).optional(),
  numberOfWindows: Joi.number().integer().min(0).optional(),
  houseItems: Joi.string().optional(),

  // Agreement Terms
  durationValue: Joi.number().integer().min(1).default(12),
  durationUnit: Joi.string().valid('MONTH', 'YEAR').default('MONTH'),
  effectiveDate: Joi.date().required(),
  terminationDate: Joi.date().optional(),
  rentalAmount: Joi.number().positive().required(),
  paymentTerms: Joi.string().optional(),
  advancePayment: Joi.number().min(0).default(0),
  paymentFrequencyName: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY').default('MONTHLY'),
  notes: Joi.string().optional()
});

const verifyCodeSchema = Joi.object({
  agreementId: Joi.string().required().uuid(),
  phone: Joi.string().required().pattern(/^(09|07)\d{8}$/),
  code: Joi.string().required().length(6).pattern(/^\d{6}$/)
});

const paymentSchema = Joi.object({
  agreementId: Joi.string().required().uuid(),
  phone: Joi.string().required().pattern(/^(09|07)\d{8}$/),
  pin: Joi.string().required().length(4).pattern(/^\d{4}$/)
});

// ============================================
// OFFICE SCHEMAS
// ============================================

const createOfficeSchema = Joi.object({
  officeName: Joi.string().required().min(2).max(100),
  officeCode: Joi.string().required().min(2).max(20),
  region: Joi.string().required(),
  city: Joi.string().required(),
  subCity: Joi.string().optional(),
  woreda: Joi.string().optional(),
  address: Joi.string().optional()
});

// ============================================
// PAYMENT SCHEMAS
// ============================================

const createPaymentSchema = Joi.object({
  referenceNumber: Joi.string().required(),
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid('TELEBIRR', 'CBE', 'STARPAY').required(),
  customerName: Joi.string().optional(),
  customerPhoneNumber: Joi.string().optional().pattern(/^(09|07)\d{8}$/)
});

const updatePaymentStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'PAID', 'FAILED', 'CANCELLED').required(),
  transactionReference: Joi.string().optional()
});

// ============================================
// DASHBOARD SCHEMAS
// ============================================

const getContractsSchema = Joi.object({
  referenceNumber: Joi.string().optional(),
  status: Joi.string().valid('DRAFT', 'PENDING_VERIFICATION', 'PENDING_SERVICE_FEE', 'APPROVED', 'REJECTED', 'ACTIVE', 'TERMINATED', 'EXPIRED').optional(),
  subCity: Joi.string().optional(),
  landlord: Joi.string().optional(),
  tenant: Joi.string().optional()
});

const getAuditLogsSchema = Joi.object({
  action: Joi.string().optional(),
  userId: Joi.string().uuid().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

const getReportsSchema = Joi.object({
  subCity: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

const getNotificationsSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  isRead: Joi.boolean().optional()
});

const getOfficersSchema = Joi.object({
  subCity: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

const getOfficeAdminsSchema = Joi.object({
  officeId: Joi.string().uuid().optional(),
  subCity: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  officeCode: Joi.string().optional()
});

const getOfficeSummarySchema = Joi.object({
  officeId: Joi.string().uuid().optional(),
  subCity: Joi.string().optional()
});

const getOfficesSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  subCity: Joi.string().optional(),
  city: Joi.string().optional()
});

// ============================================
// APPROVAL SCHEMAS
// ============================================

const approveAgreementSchema = Joi.object({
  comments: Joi.string().optional()
});

const rejectAgreementSchema = Joi.object({
  comments: Joi.string().required()
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