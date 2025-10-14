/**
 * Sync-on-save utility - Syncs file to cloud when saved
 */

import { resolve, relative } from 'path';
import { syncFile } from './syncEngine.js';
import { getToken } from '../storage/credentials.js';
import { getApiUrl } from '../../utils/cloudConfig.js';
import { loadConfig } from '../../utils/config.js';
import { checkSubscriptionStatus } from '../subscription/subscriptionCheck.js';
import { checkStorageQuota } from '../storage/storageValidation.js';
import { readFileSync } from 'fs';

/**
 * Sync file to cloud after it's been saved locally
 * @param {string} filePath - Path to the saved file
 * @returns {Promise<object|null>} Sync result or null if not authenticated/enabled
 */
export async function syncFileOnSave(filePath) {
  try {
    // Load configuration first
    const config = loadConfig();

    // Check if cloud sync is enabled
    if (!config.cloud?.enabled) {
      return null; // Silently skip if cloud sync is disabled
    }

    // Only sync .md files
    if (!filePath.endsWith('.md')) {
      return null;
    }

    // Check subscription status
    const subscriptionResult = await checkSubscriptionStatus(config);
    if (!subscriptionResult.hasSubscription) {
      // Silently skip if no premium subscription
      // This avoids interrupting the user's workflow with errors during file saves
      return null;
    }

    // Resolve absolute path
    const absolutePath = resolve(filePath);

    // Use default location as base directory
    const baseDir = config.defaultLocation;
    const apiUrl = getApiUrl(config);
    const token = await getToken();


    // Sync the file (storage validation is handled within syncFile)
    const result = await syncFile(absolutePath, baseDir, apiUrl, token, config);

    // Log important results
    if (result.action === 'conflict') {
      console.warn(`Sync conflict: ${result.filename}`);
    }

    return result;

  } catch (error) {
    console.error('Sync-on-save failed:', error.message);
    return { action: 'error', error: error.message };
  }
}

/**
 * Check if sync-on-save is available
 * @returns {Promise<boolean>}
 */
export async function isSyncOnSaveAvailable() {
  try {
    const config = loadConfig();
    if (!config.cloud?.enabled) {
      return false;
    }

    const subscriptionResult = await checkSubscriptionStatus(config);
    return subscriptionResult.hasSubscription;
  } catch {
    return false;
  }
}

/**
 * Get sync-on-save status
 * @returns {Promise<object>}
 */
export async function getSyncOnSaveStatus() {
  try {
    const config = loadConfig();
    const isEnabled = !!config.cloud?.enabled;
    const subscriptionResult = await checkSubscriptionStatus(config);

    return {
      available: subscriptionResult.hasSubscription && isEnabled,
      authenticated: !subscriptionResult.error || subscriptionResult.error !== 'Not authenticated',
      enabled: isEnabled,
      hasSubscription: subscriptionResult.hasSubscription,
      apiUrl: getApiUrl(config),
      user: subscriptionResult.user
    };
  } catch (error) {
    return {
      available: false,
      authenticated: false,
      enabled: false,
      hasSubscription: false,
      error: error.message
    };
  }
}

export default {
  syncFileOnSave,
  isSyncOnSaveAvailable,
  getSyncOnSaveStatus
};