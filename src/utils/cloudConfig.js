/**
 * Cloud-specific configuration utilities
 * Extends the base config with cloud sync settings
 */

const DEFAULT_CLOUD_CONFIG = {
  enabled: false,
  autoSync: false,
  syncInterval: 300000, // 5 minutes in ms
  apiUrl: process.env.SPLITMARK_API_URL || 'https://api.splitmark.app',
  encryptionEnabled: true,
  lastSyncTime: null,
  onboardingCompleted: false,
  onboardingShownCount: 0,
  completedAt: null,
};

/**
 * Get cloud configuration from main config
 */
export function getCloudConfig(config) {
  return {
    ...DEFAULT_CLOUD_CONFIG,
    ...(config.cloud || {}),
  };
}

/**
 * Update cloud configuration
 */
export function updateCloudConfig(config, updates) {
  return {
    ...config,
    cloud: {
      ...getCloudConfig(config),
      ...updates,
    },
  };
}

/**
 * Check if cloud sync is enabled
 */
export function isCloudEnabled(config) {
  const cloudConfig = getCloudConfig(config);
  return cloudConfig.enabled === true;
}

/**
 * Check if auto-sync is enabled
 */
export function isAutoSyncEnabled(config) {
  const cloudConfig = getCloudConfig(config);
  return cloudConfig.enabled && cloudConfig.autoSync;
}

/**
 * Get API base URL
 */
export function getApiUrl(config) {
  const cloudConfig = getCloudConfig(config);
  return cloudConfig.apiUrl;
}

export default {
  DEFAULT_CLOUD_CONFIG,
  getCloudConfig,
  updateCloudConfig,
  isCloudEnabled,
  isAutoSyncEnabled,
  getApiUrl,
};
