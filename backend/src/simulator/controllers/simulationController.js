const config = require('../config');
const { scheduleCallback, sendWebhook, getRecentSimulations } = require('../services/callbackScheduler');

const initiatePayment = async (req, res) => {
  try {
    const {
      paymentId,
      referenceNumber,
      amount,
      customerName,
      customerPhoneNumber,
      provider = 'TELEBIRR',
      mode,
      delayMs,
      callbackUrl
    } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'paymentId is required to correlate simulator callback with SmartRent database'
      });
    }

    const providerPrefix = (provider || 'TELEBIRR').toUpperCase() === 'CBE' ? 'CBE-SIM' : 'TEL-SIM';
    const transactionReference = `${providerPrefix}-${Date.now()}`;

    console.log(`[Simulator Controller] Received ${provider} initiation request for paymentId="${paymentId}", amount=${amount}`);

    scheduleCallback({
      paymentId,
      transactionReference,
      amount,
      provider: provider.toUpperCase(),
      statusOverride: mode,
      delayOverride: delayMs,
      callbackUrlOverride: callbackUrl
    });

    return res.status(200).json({
      success: true,
      provider: provider.toUpperCase(),
      status: 'PENDING',
      transactionReference,
      message: `${provider.toUpperCase()} simulated payment initiated successfully. Asynchronous webhook scheduled.`
    });
  } catch (error) {
    console.error('[Simulator Controller] Error in initiatePayment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal simulator error'
    });
  }
};

const initiateTelebirr = async (req, res) => {
  req.body.provider = 'TELEBIRR';
  return initiatePayment(req, res);
};

const initiateCBE = async (req, res) => {
  req.body.provider = 'CBE';
  return initiatePayment(req, res);
};

const manualTriggerCallback = async (req, res) => {
  try {
    const {
      paymentId,
      transactionReference,
      status = 'SUCCESS',
      amount = 0,
      provider = 'TELEBIRR',
      callbackUrl
    } = req.body;

    if (!paymentId || !transactionReference) {
      return res.status(400).json({
        success: false,
        error: 'paymentId and transactionReference are required'
      });
    }

    const targetUrl = callbackUrl || config.callbackUrl;
    const payload = {
      paymentId,
      transactionReference,
      status: status.toUpperCase() === 'FAILED' ? 'FAILED' : 'SUCCESS',
      provider,
      amount,
      timestamp: new Date().toISOString(),
      notes: 'Manually triggered webhook callback from Provider Simulator'
    };

    const webhookResult = await sendWebhook(targetUrl, payload);

    return res.status(200).json({
      success: webhookResult.success,
      message: 'Manual webhook callback sent to SmartRent backend',
      webhookResult
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getSimulatorStatus = async (req, res) => {
  return res.status(200).json({
    status: 'ONLINE',
    environment: 'DEPLOYED_EMBEDDED_SIMULATOR',
    disclaimer: 'This is a development simulator for Telebirr/CBE payment rails. Not for production use.',
    config: {
      port: config.port,
      callbackUrl: config.callbackUrl,
      delayMs: config.getEffectiveDelay(),
      defaultStatus: config.getEffectiveStatus(),
      signatureSecretConfigured: Boolean(config.signatureSecret)
    },
    recentSimulations: getRecentSimulations()
  });
};

const updateSimulatorConfig = async (req, res) => {
  const { delayMs, defaultStatus } = req.body;

  if (delayMs !== undefined) {
    config.runtimeSettings.delayMs = parseInt(delayMs, 10);
  }

  if (defaultStatus !== undefined) {
    const allowed = ['SUCCESS', 'FAILED', 'TIMEOUT', 'DUPLICATE'];
    if (!allowed.includes(defaultStatus.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${allowed.join(', ')}`
      });
    }
    config.runtimeSettings.defaultStatus = defaultStatus.toUpperCase();
  }

  return res.status(200).json({
    success: true,
    message: 'Simulator runtime configuration updated successfully',
    currentConfig: {
      delayMs: config.getEffectiveDelay(),
      defaultStatus: config.getEffectiveStatus()
    }
  });
};

module.exports = {
  initiatePayment,
  initiateTelebirr,
  initiateCBE,
  manualTriggerCallback,
  getSimulatorStatus,
  updateSimulatorConfig
};
