const approvalService = require('../services/approvalService');

// ============================================
// APPROVE AGREEMENT
// ============================================

const approveAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const result = await approvalService.approveAgreement(id, req.user.userId, comments);

    res.status(200).json({
      success: true,
      message: 'Agreement approved and activated. Reference number generated.',
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ============================================
// REJECT AGREEMENT
// ============================================

const rejectAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const result = await approvalService.rejectAgreement(id, req.user.userId, comments);

    res.status(200).json({
      success: true,
      message: 'Agreement rejected',
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ============================================
// GET APPROVAL HISTORY
// ============================================

const getApprovalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await approvalService.getApprovalHistory(id);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

// ============================================
// AUTO-APPROVE AGREEMENT (For System/Super Admin)
// ============================================

const autoApproveAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    // Only Super Admin can manually trigger auto-approve
    if (!['SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only Super Admin can auto-approve agreements'
      });
    }

    const result = await approvalService.autoApproveAgreement(
      id,
      req.user.userId,
      comments || 'Auto-approved by system'
    );

    res.status(200).json({
      success: true,
      message: 'Agreement auto-approved successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  approveAgreement,
  rejectAgreement,
  getApprovalHistory,
  autoApproveAgreement
};