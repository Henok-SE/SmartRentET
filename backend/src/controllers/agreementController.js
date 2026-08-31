const agreementService = require('../services/agreementService');
const prisma = require('../config/db');
const { agreementDTO } = require('../utils/userUtils');

// ============================================
// CREATE AGREEMENT
// ============================================

const createAgreement = async (req, res) => {
  try {
    console.log('=== CREATE AGREEMENT ===');

    if (!['OFFICER', 'OFFICE_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only Officers and Office Admins can create rental agreements.'
      });
    }

    let officerId = null;
    let officeId = null;

    if (req.user.role === 'OFFICER') {
      const officer = await prisma.officer.findUnique({
        where: { userId: req.user.userId }
      });

      if (!officer) {
        return res.status(404).json({
          success: false,
          error: 'Officer record not found. Please contact administrator.'
        });
      }

      officerId = officer.officerId;
      officeId = officer.officeId;

    } else if (req.user.role === 'OFFICE_ADMIN') {
      const admin = await prisma.officeAdmin.findUnique({
        where: { userId: req.user.userId }
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Office Admin record not found. Please contact administrator.'
        });
      }

      const officer = await prisma.officer.findFirst({
        where: { officeId: admin.officeId }
      });

      if (!officer) {
        return res.status(404).json({
          success: false,
          error: 'No officer found in this office. Please create an officer first.'
        });
      }

      officerId = officer.officerId;
      officeId = admin.officeId;
    }

    if (!officerId) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine officer. Please contact administrator.'
      });
    }

    const result = await agreementService.createAgreement(
      req.body,
      req.user.userId,
      officerId,
      officeId
    );

    if (result.requiresVerification) {
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          requiresVerification: true,
          parties: result.parties,
          userIds: result.userIds,
          verificationSent: result.verificationSent
        }
      });
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.agreement
    });

  } catch (error) {
    console.error('Create agreement error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// VERIFY USSD CODE (Consent) - agreementId from body
// ============================================

const verifyCode = async (req, res) => {
  try {
    const { agreementId, phone, code } = req.body;
    const result = await agreementService.verifyAgreementCode(agreementId, phone, code);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// PROCESS SERVICE FEE PAYMENT - agreementId from body
// ============================================

const processServiceFeePayment = async (req, res) => {
  try {
    const { agreementId, phone, pin } = req.body;
    const result = await agreementService.processServiceFeePayment(agreementId, phone, pin);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET AGREEMENT
// ============================================

const getAgreement = async (req, res) => {
  try {
    const agreement = await agreementService.getAgreementById(req.params.id);

    res.status(200).json({
      success: true,
      data: agreement
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// APPROVE AGREEMENT
// ============================================

const approveAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const result = await agreementService.approveAgreement(id, req.user.userId, comments);

    res.status(200).json({
      success: true,
      message: 'Agreement approved and activated.',
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// REJECT AGREEMENT
// ============================================

const rejectAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const result = await agreementService.rejectAgreement(id, req.user.userId, comments);

    res.status(200).json({
      success: true,
      message: 'Agreement rejected',
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET APPROVAL HISTORY
// ============================================

const getApprovalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await prisma.agreementApproval.findMany({
      where: { agreementId: id },
      include: { officer: { include: { user: true } } },
      orderBy: { approvalDate: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: history
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createAgreement,
  verifyCode,
  processServiceFeePayment,
  getAgreement,
  approveAgreement,
  rejectAgreement,
  getApprovalHistory
};