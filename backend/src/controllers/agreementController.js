const agreementService = require('../services/agreementService');

/**
 * Create a new rental agreement
 */
const create = async (req, res) => {
  try {
    const agreement = await agreementService.createAgreement(req.body, req.user.userId);
    res.status(201).json({
      message: 'Rental agreement created successfully',
      data: agreement
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all agreements for logged in user
 */
const getAll = async (req, res) => {
  try {
    const agreements = await agreementService.getAgreements(req.user);
    res.status(200).json({
      message: 'Agreements retrieved successfully',
      data: agreements
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get single agreement by ID
 */
const getById = async (req, res) => {
  try {
    const agreement = await agreementService.getAgreementById(req.params.id);
    res.status(200).json({
      message: 'Agreement details retrieved',
      data: agreement
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

/**
 * Process agreement approval (Officer only)
 */
const approveOrReject = async (req, res) => {
  try {
    const { approvalType, decision, comments } = req.body;
    const approval = await agreementService.processApproval(
      req.params.id,
      req.user.userId,
      approvalType,
      decision,
      comments
    );

    res.status(200).json({
      message: `Agreement decision logged: ${decision}`,
      data: approval
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  approveOrReject
};