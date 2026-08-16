const prisma = require('../config/database');
const agreementService = require('../services/agreementService');
const { validateRequiredFields } = require('../utils/validation');

const createAgreement = async (req, res) => {
  try {
    if (req.user.role !== 'OFFICER') {
      return res.status(403).json({
        success: false,
        error: 'Only Officers can create rental agreements.'
      });
    }

    const agreement = await agreementService.createAgreement(req.body);
    res.status(201).json({
      success: true,
      message: 'Agreement created. USSD consent requests sent.',
      data: agreement
    });

  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const processUSSDConsent = async (req, res) => {
  try {
    const { agreementId, phone, response } = req.body;
    const result = await agreementService.processUSSDConsent(agreementId, phone, response);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const process50BirrPayment = async (req, res) => {
  try {
    const { agreementId, phone, pin } = req.body;
    const result = await agreementService.process50BirrPayment(agreementId, phone, pin);
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
  processUSSDConsent,
  process50BirrPayment,
  getAgreement
};