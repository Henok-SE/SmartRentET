const axios = require('axios');
const config = require('../config');
const { generateSignature } = require('./signatureService');

const recentSimulations = [];
const MAX_LOG_SIZE = 50;

function logSimulation(entry) {
  recentSimulations.unshift({
    id: `SIM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    ...entry
  });
  if (recentSimulations.length > MAX_LOG_SIZE) {
    recentSimulations.pop();
  }
}

// Send webhook HTTP request to backend
async function sendWebhook(targetUrl, payload) {
  const signature = generateSignature(payload);
  
  console.log(`[Simulator Webhook] Sending callback to: ${targetUrl}`);
  console.log(`[Simulator Webhook] Payload:`, JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(targetUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Provider-Signature': signature,
        'X-Provider-Simulator': 'SmartRent-Provider-Simulator-v1',
        'User-Agent': 'SmartRent-Provider-Simulator/1.0.0'
      },
      timeout: 10000
    });

    console.log(`[Simulator Webhook] Response Status: ${response.status} ${response.statusText}`);
    return {
      success: true,
      statusCode: response.status,
      responseData: response.data
    };
  } catch (error) {
    const status = error.response ? error.response.status : 'NETWORK_ERROR';
    const errorData = error.response ? error.response.data : error.message;
    console.error(`[Simulator Webhook] Failed with status ${status}:`, errorData);
    return {
      success: false,
      statusCode: status,
      error: errorData
    };
  }
}

// Schedule asynchronous simulated provider callback
function scheduleCallback({
  paymentId,
  transactionReference,
  amount,
  provider,
  statusOverride,
  delayOverride,
  callbackUrlOverride
}) {
  const outcome = statusOverride || config.getEffectiveStatus();
  const delayMs = delayOverride !== undefined && delayOverride !== null
    ? parseInt(delayOverride, 10)
    : config.getEffectiveDelay();
  const targetUrl = callbackUrlOverride || config.callbackUrl;

  const simulationRecord = {
    paymentId,
    transactionReference,
    amount,
    provider,
    outcome,
    delayMs,
    targetUrl,
    scheduledAt: new Date().toISOString(),
    status: 'SCHEDULED'
  };

  logSimulation(simulationRecord);

  console.log(`[Simulator Scheduler] Scheduled ${outcome} callback for paymentId="${paymentId}" (tx="${transactionReference}") in ${delayMs}ms -> ${targetUrl}`);

  if (outcome === 'TIMEOUT') {
    setTimeout(() => {
      console.log(`[Simulator Scheduler] TIMEOUT simulation complete for paymentId="${paymentId}". No webhook sent.`);
      simulationRecord.status = 'TIMED_OUT';
      simulationRecord.completedAt = new Date().toISOString();
    }, delayMs);
    return;
  }

  setTimeout(async () => {
    const callbackPayload = {
      paymentId,
      transactionReference,
      status: outcome === 'FAILED' ? 'FAILED' : 'SUCCESS',
      provider: provider || 'TELEBIRR',
      amount: amount || 0,
      timestamp: new Date().toISOString(),
      notes: outcome === 'FAILED' 
        ? 'Simulated payment failure (insufficient balance or cancelled)' 
        : 'Simulated payment completed successfully by provider'
    };

    if (outcome === 'DUPLICATE') {
      console.log(`[Simulator Scheduler] Executing DUPLICATE callback test (Sending 2 consecutive webhooks)...`);
      
      const res1 = await sendWebhook(targetUrl, callbackPayload);
      simulationRecord.firstWebhookResult = res1;

      setTimeout(async () => {
        const res2 = await sendWebhook(targetUrl, callbackPayload);
        simulationRecord.secondWebhookResult = res2;
        simulationRecord.status = res1.success && res2.success ? 'DUPLICATE_SENT' : 'PARTIAL_FAILURE';
        simulationRecord.completedAt = new Date().toISOString();
      }, 300);

    } else {
      const res = await sendWebhook(targetUrl, callbackPayload);
      simulationRecord.webhookResult = res;
      simulationRecord.status = res.success ? 'COMPLETED' : 'WEBHOOK_FAILED';
      simulationRecord.completedAt = new Date().toISOString();
    }
  }, delayMs);
}

function getRecentSimulations() {
  return recentSimulations;
}

module.exports = {
  scheduleCallback,
  sendWebhook,
  getRecentSimulations
};
