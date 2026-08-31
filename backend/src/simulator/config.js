/**
 * Provider Simulator Configuration for Deployed Render / Local Environment
 */
const config = {
  port: process.env.PORT || 5000,
  callbackUrl: process.env.SMARTRENT_CALLBACK_URL || `http://localhost:${process.env.PORT || 5000}/api/payments/provider-webhook`,
  defaultDelayMs: parseInt(process.env.SIMULATOR_DELAY_MS || '4000', 10),
  defaultStatus: (process.env.SIMULATOR_DEFAULT_STATUS || 'SUCCESS').toUpperCase(),
  signatureSecret: process.env.PROVIDER_WEBHOOK_SECRET || 'smartrent_sim_secret_key_2026',

  // Runtime mutable settings (for test overrides)
  runtimeSettings: {
    delayMs: null,
    defaultStatus: null
  },

  getEffectiveDelay() {
    return this.runtimeSettings.delayMs !== null 
      ? this.runtimeSettings.delayMs 
      : this.defaultDelayMs;
  },

  getEffectiveStatus() {
    return this.runtimeSettings.defaultStatus !== null 
      ? this.runtimeSettings.defaultStatus 
      : this.defaultStatus;
  }
};

module.exports = config;
