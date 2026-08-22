const prisma = require('../config/db');
const agreementService = require('../services/agreementService');

const createAgreement = async (req, res) => {
  try {
    console.log('=== CREATE AGREEMENT ===');
    console.log('User:', req.user);
    
    // Only OFFICER or OFFICE_ADMIN can create agreements
    if (!['OFFICER', 'OFFICE_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only Officers and Office Admins can create rental agreements.'
      });
    }

    // Get officerId
    let officerId = null;
    let officeId = 1;

    if (req.user.role === 'OFFICER') {
      const officer = await prisma.officer.findUnique({
        where: { userId: req.user.userId }
      });
      
      console.log('Officer found:', officer);
      
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
      
      console.log('Office Admin found:', admin);
      
      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Office Admin record not found. Please contact administrator.'
        });
      }
      
      // For Office Admin, find the first officer in their office
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

    console.log('OfficerId:', officerId);
    console.log('OfficeId:', officeId);

    if (!officerId) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine officer. Please contact administrator.'
      });
    }

    // Pass userId (for AuditLog) and officerId (for agreement)
    const agreement = await agreementService.createAgreement(
      req.body,
      req.user.userId,  
      officerId,        
      officeId
    );

    res.status(201).json({
      success: true,
      message: 'Agreement created. USSD verification codes sent.',
      data: agreement
    });

  } catch (error) {
    console.error('Create agreement error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

const verifyCode = async (req, res) => {
  try {
    const { agreementId, phone, code } = req.body;
    const result = await agreementService.verifyAgreementCode(agreementId, phone, code);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const processServiceFeePayment = async (req, res) => {
  try {
    const { agreementId, phone, pin } = req.body;
    const result = await agreementService.processServiceFeePayment(agreementId, phone, pin);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const getAgreement = async (req, res) => {
  try {
    const agreement = await agreementService.getAgreementById(req.params.id);
    res.status(200).json({ success: true, data: agreement });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

module.exports = {
  createAgreement,
  verifyCode,
  processServiceFeePayment,
  getAgreement
};