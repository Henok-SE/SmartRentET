const prisma = require('../config/database');
const approvalService = require('../services/approvalService');
const agreementService = require('../services/agreementService');

const approveAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const officerId = req.user.userId;

    if (!['OFFICER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only OFFICER or ADMIN can approve agreements'
      });
    }

    const officer = await prisma.officer.findUnique({
      where: { userId: officerId }
    });

    if (!officer && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    const officerIdToUse = officer ? officer.officerId : null;

    const result = await approvalService.approveAgreement(
      Number(id),
      officerIdToUse || officerId,
      comments
    );

    res.json({
      success: true,
      message: result.referenceNumberGenerated
        ? 'Agreement approved and activated. Reference number generated.'
        : 'Agreement approved. Pending final approval.',
      data: result
    });

  } catch (error) {
    const clientErrors = [
      'Agreement not found',
      'Agreement cannot be approved',
      'Officer not found'
    ];

    if (clientErrors.some(msg => error.message.includes(msg))) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Approve agreement error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during approval'
    });
  }
};

const rejectAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    if (!comments) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when rejecting an agreement'
      });
    }

    if (!['OFFICER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only OFFICER or ADMIN can reject agreements'
      });
    }

    const officer = await prisma.officer.findUnique({
      where: { userId: req.user.userId }
    });

    if (!officer && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    const officerIdToUse = officer ? officer.officerId : req.user.userId;

    const result = await approvalService.rejectAgreement(
      Number(id),
      officerIdToUse,
      comments
    );

    res.json({
      success: true,
      message: 'Agreement rejected',
      data: result
    });

  } catch (error) {
    const clientErrors = [
      'Agreement not found',
      'Agreement cannot be rejected'
    ];

    if (clientErrors.some(msg => error.message.includes(msg))) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Reject agreement error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during rejection'
    });
  }
};

const getApprovalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const agreement = await agreementService.getAgreementById(Number(id));
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Agreement not found'
      });
    }

    const user = req.user;
    const isLandlord = user.role === 'LANDLORD' && agreement.landlord.userId === user.userId;
    const isTenant = user.role === 'TENANT' && agreement.tenant.userId === user.userId;
    const isAdminOrOfficer = ['ADMIN', 'OFFICER'].includes(user.role);

    if (!isLandlord && !isTenant && !isAdminOrOfficer) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this history'
      });
    }

    const history = await approvalService.getApprovalHistory(Number(id));

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  approveAgreement,
  rejectAgreement,
  getApprovalHistory
};