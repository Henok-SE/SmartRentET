const prisma = require('../config/db');
const agreementService = require('../services/agreementService');

const createAgreement = async (req, res) => {
  try {
    if (req.user.role !== 'OFFICER' && req.user.role !== 'SYSTEM_ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only Officers can create rental agreements.'
      });
    }

    const agreement = await agreementService.createAgreement(req.body);
    res.status(201).json({
      success: true,
      message: 'Agreement created. USSD verification codes sent.',
      data: agreement
    });

  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const processUSSDVerification = async (req, res) => {
  try {
    const { agreementId, phone, code } = req.body;
    const targetId = agreementId || req.params.id;
    const result = await agreementService.processUSSDVerification(targetId, phone, code);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const process50BirrPayment = async (req, res) => {
  try {
    const { agreementId, phone, pin } = req.body;
    const targetId = agreementId || req.params.id;
    const result = await agreementService.process50BirrPayment(targetId, phone, pin);
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
  processUSSDVerification,
  process50BirrPayment,
  getAgreement
};