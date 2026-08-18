const approvalService = require('../services/approvalService');

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

const getApprovalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await approvalService.getApprovalHistory(id);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

module.exports = {
  approveAgreement,
  rejectAgreement,
  getApprovalHistory
};