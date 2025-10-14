/**
 * Storage validation utilities
 * Handles storage quota checks and validation before file operations
 */

import { SplitmarkAPIClient } from '../api/client.js';
import { getApiUrl } from '../../utils/cloudConfig.js';

// Storage limits
const PREMIUM_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB in bytes
const FREE_STORAGE_LIMIT = 0; // Free users have no cloud storage

/**
 * Get current storage usage for user
 * @param {object} config - App configuration
 * @param {string} token - JWT token
 * @returns {Promise<{used: number, limit: number, available: number}>}
 */
export async function getStorageUsage(config, token) {
  try {
    const apiUrl = getApiUrl(config);
    const client = new SplitmarkAPIClient(apiUrl, token);
    const response = await client.get('/storage/usage');
    const usage = response;

    return {
      used: usage.used || 0,
      limit: usage.limit || PREMIUM_STORAGE_LIMIT,
      available: (usage.limit || PREMIUM_STORAGE_LIMIT) - (usage.used || 0)
    };
  } catch (error) {
    // If API doesn't support storage endpoint, use default limits
    console.warn('Could not fetch storage usage, using default limits');
    return {
      used: 0,
      limit: PREMIUM_STORAGE_LIMIT,
      available: PREMIUM_STORAGE_LIMIT
    };
  }
}

/**
 * Check if user has sufficient storage for a file
 * @param {object} config - App configuration
 * @param {string} token - JWT token
 * @param {number} fileSize - Size of file in bytes
 * @param {object} user - User object with isPremium status
 * @returns {Promise<{canUpload: boolean, reason?: string, usage?: object}>}
 */
export async function checkStorageQuota(config, token, fileSize, user) {
  try {
    // Free users have no cloud storage
    if (!user?.isPremium) {
      return {
        canUpload: false,
        reason: 'Premium subscription required for cloud storage',
        usage: { used: 0, limit: 0, available: 0 }
      };
    }

    const usage = await getStorageUsage(config, token);

    // Check if file would exceed storage limit
    if (fileSize > usage.available) {
      const usedGB = (usage.used / (1024 * 1024 * 1024)).toFixed(2);
      const limitGB = (usage.limit / (1024 * 1024 * 1024)).toFixed(2);
      const fileMB = (fileSize / (1024 * 1024)).toFixed(2);

      return {
        canUpload: false,
        reason: `File (${fileMB} MB) would exceed storage limit. Using ${usedGB} GB of ${limitGB} GB.`,
        usage
      };
    }

    return {
      canUpload: true,
      usage
    };
  } catch (error) {
    console.warn('Storage validation failed, allowing upload:', error.message);
    // On validation failure, allow upload (server will validate)
    return {
      canUpload: true,
      reason: 'Could not validate storage quota'
    };
  }
}

/**
 * Validate storage before multiple file operations
 * @param {object} config - App configuration
 * @param {string} token - JWT token
 * @param {Array<{path: string, size: number}>} files - Array of files to validate
 * @param {object} user - User object
 * @returns {Promise<{canUpload: boolean, rejectedFiles: Array, reason?: string}>}
 */
export async function validateBatchStorage(config, token, files, user) {
  try {
    if (!user?.isPremium) {
      return {
        canUpload: false,
        rejectedFiles: files,
        reason: 'Premium subscription required for cloud storage'
      };
    }

    const usage = await getStorageUsage(config, token);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > usage.available) {
      const usedGB = (usage.used / (1024 * 1024 * 1024)).toFixed(2);
      const limitGB = (usage.limit / (1024 * 1024 * 1024)).toFixed(2);
      const totalMB = (totalSize / (1024 * 1024)).toFixed(2);

      return {
        canUpload: false,
        rejectedFiles: files,
        reason: `Files (${totalMB} MB) would exceed storage limit. Using ${usedGB} GB of ${limitGB} GB.`
      };
    }

    return {
      canUpload: true,
      rejectedFiles: []
    };
  } catch (error) {
    console.warn('Batch storage validation failed, allowing uploads:', error.message);
    return {
      canUpload: true,
      rejectedFiles: []
    };
  }
}

/**
 * Format storage information for user display
 * @param {object} usage - Storage usage object
 * @returns {string}
 */
export function formatStorageInfo(usage) {
  const usedMB = (usage.used / (1024 * 1024)).toFixed(1);
  const limitGB = (usage.limit / (1024 * 1024 * 1024)).toFixed(1);
  const percentUsed = ((usage.used / usage.limit) * 100).toFixed(1);

  return `${usedMB} MB used of ${limitGB} GB (${percentUsed}% full)`;
}

/**
 * Get storage warning message if approaching limit
 * @param {object} usage - Storage usage object
 * @returns {string|null} Warning message or null
 */
export function getStorageWarning(usage) {
  const percentUsed = (usage.used / usage.limit) * 100;

  if (percentUsed >= 95) {
    return '⚠️ Storage almost full! Please delete some files or upgrade your plan.';
  } else if (percentUsed >= 80) {
    return '⚠️ Storage 80% full. Consider cleaning up files to avoid upload issues.';
  }

  return null;
}

export default {
  getStorageUsage,
  checkStorageQuota,
  validateBatchStorage,
  formatStorageInfo,
  getStorageWarning,
  PREMIUM_STORAGE_LIMIT,
  FREE_STORAGE_LIMIT
};