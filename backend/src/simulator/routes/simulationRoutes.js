const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  initiateTelebirr,
  initiateCBE,
  manualTriggerCallback,
  getSimulatorStatus,
  updateSimulatorConfig
} = require('../controllers/simulationController');

// Provider initiation endpoints
router.post('/telebirr/initiate', initiateTelebirr);
router.post('/cbe/initiate', initiateCBE);
router.post('/payments/initiate', initiatePayment);

// Simulator testing and configuration endpoints
router.post('/simulate/callback', manualTriggerCallback);
router.get('/simulate/status', getSimulatorStatus);
router.post('/simulate/config', updateSimulatorConfig);

module.exports = router;
