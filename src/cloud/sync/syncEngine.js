/**
 * Sync engine - Core synchronization logic
 * Handles bidirectional sync between local files and cloud
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { basename, join, relative } from 'path';
import { listFiles, uploadFile, downloadFile, updateFile, deleteFile } from '../api/files.js';
import { encryptForUpload, decryptFromDownload, generateContentHash } from '../encryption/crypto.js';
import { getUserEncryptionKey } from '../encryption/keyManager.js';
import {
  getFileState,
  markAsSynced,
  markAsPending,
  markAsConflict,
  markAsError,
  getAllFileStates,
} from '../storage/syncState.js';
import { getToken } from '../storage/credentials.js';
import { getApiUrl } from '../../utils/cloudConfig.js';
import { checkStorageQuota, formatStorageInfo } from '../storage/storageValidation.js';
import { checkSubscriptionStatus } from '../subscription/subscriptionCheck.js';

/**
 * Sync a single file
 * @param {string} localPath - Full path to local file
 * @param {string} baseDir - Base directory for relative path calculation
 * @param {string} apiUrl - API base URL
 * @param {string} token - JWT token
 * @returns {Promise<object>} Sync result
 */
export async function syncFile(localPath, baseDir, apiUrl, token, config = null) {
  const relativePath = relative(baseDir, localPath).replace(/\\/g, '/'); // Use forward slashes for consistency
  const filename = basename(localPath);
  const encryptionKey = getUserEncryptionKey();

  try {
    // Get current file state (use relative path as key for uniqueness)
    const fileState = getFileState(relativePath);

    // Read local file
    const localContent = readFileSync(localPath, 'utf8');
    const localHash = generateContentHash(localContent);

    // Get cloud files
    const cloudFiles = await listFiles(apiUrl, token);
    const cloudFile = cloudFiles.find((f) => (f.relative_path || f.filename) === relativePath);

    // Determine sync action
    if (!fileState) {
      // First time syncing this file
      if (!cloudFile) {
        // Upload to cloud
        return await uploadToCloud(localPath, relativePath, localContent, localHash, apiUrl, token, encryptionKey, config);
      } else {
        // File exists in cloud, download and check
        const cloudContent = await downloadFromCloud(cloudFile.id, relativePath, apiUrl, token, encryptionKey);
        const cloudHash = generateContentHash(cloudContent);

        if (localHash === cloudHash) {
          // Same content, just update state
          markAsSynced(relativePath, cloudFile.id, localHash, localPath);
          return { action: 'no_change', filename: relativePath };
        } else {
          // Different content - conflict
          markAsConflict(relativePath, 'File exists both locally and in cloud with different content');
          return { action: 'conflict', filename: relativePath };
        }
      }
    } else {
      // File has been synced before
      const localChanged = localHash !== fileState.lastSyncedHash;
      const cloudChanged = cloudFile && cloudFile.contentHash !== fileState.lastSyncedHash;

      if (localChanged && !cloudChanged) {
        // Only local changed - upload
        if (cloudFile) {
          return await updateInCloud(cloudFile.id, localPath, relativePath, localContent, localHash, apiUrl, token, encryptionKey, config);
        } else {
          return await uploadToCloud(localPath, relativePath, localContent, localHash, apiUrl, token, encryptionKey, config);
        }
      } else if (!localChanged && cloudChanged) {
        // Only cloud changed - download
        const cloudContent = await downloadFromCloud(cloudFile.id, relativePath, apiUrl, token, encryptionKey);
        writeFileSync(localPath, cloudContent, 'utf8');
        markAsSynced(relativePath, cloudFile.id, cloudFile.content_hash || cloudFile.contentHash, localPath);
        return { action: 'downloaded', filename: relativePath };
      } else if (localChanged && cloudChanged) {
        // Both changed - conflict
        markAsConflict(relativePath, 'File changed both locally and in cloud');
        return { action: 'conflict', filename: relativePath };
      } else {
        // Neither changed
        return { action: 'no_change', filename: relativePath };
      }
    }
  } catch (error) {
    markAsError(relativePath, error.message);
    throw error;
  }
}

/**
 * Upload file to cloud
 */
async function uploadToCloud(localPath, relativePath, content, contentHash, apiUrl, token, encryptionKey, config) {
  // Check storage quota before upload
  const subscriptionResult = await checkSubscriptionStatus(config);
  if (subscriptionResult.user?.isPremium) {
    const fileSize = Buffer.byteLength(content, 'utf8');
    const storageCheck = await checkStorageQuota(config, token, fileSize, subscriptionResult.user);

    if (!storageCheck.canUpload) {
      const errorMsg = `Upload blocked: ${storageCheck.reason}`;
      markAsError(relativePath, errorMsg);
      throw new Error(errorMsg);
    }

    // Show storage warning if approaching limit
    if (storageCheck.usage) {
      const percentUsed = (storageCheck.usage.used / storageCheck.usage.limit) * 100;
      if (percentUsed >= 80) {
        console.warn(`Storage ${percentUsed.toFixed(1)}% full - ${formatStorageInfo(storageCheck.usage)}`);
      }
    }
  }

  const { content: encryptedContent } = encryptForUpload(content, encryptionKey);
  const cloudFile = await uploadFile(apiUrl, token, relativePath, encryptedContent, contentHash);
  markAsSynced(relativePath, cloudFile.id, contentHash, localPath);
  return { action: 'uploaded', filename: relativePath, cloudId: cloudFile.id };
}

/**
 * Update file in cloud
 */
async function updateInCloud(cloudId, localPath, relativePath, content, contentHash, apiUrl, token, encryptionKey, config) {
  const { content: encryptedContent } = encryptForUpload(content, encryptionKey);
  await updateFile(apiUrl, token, cloudId, encryptedContent, contentHash, config);
  markAsSynced(relativePath, cloudId, contentHash, localPath);
  return { action: 'updated', filename: relativePath, cloudId };
}

/**
 * Download file from cloud
 */
async function downloadFromCloud(cloudId, relativePath, apiUrl, token, encryptionKey) {
  const cloudFile = await downloadFile(apiUrl, token, cloudId);
  return decryptFromDownload(cloudFile.content, encryptionKey, cloudFile.contentHash);
}

/**
 * Recursively scan directory for .md files
 * @param {string} dirPath - Directory path to scan
 * @returns {Array<string>} Array of file paths
 */
function scanDirectoryRecursive(dirPath) {
  const files = [];

  function scanDir(currentPath) {
    try {
      const items = readdirSync(currentPath);

      for (const item of items) {
        const fullPath = join(currentPath, item);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
          // Skip hidden directories and node_modules
          if (!item.startsWith('.') && item !== 'node_modules') {
            scanDir(fullPath);
          }
        } else if (stats.isFile() && item.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read (permissions, etc.)
      console.warn(`Could not read directory ${currentPath}:`, error.message);
    }
  }

  scanDir(dirPath);
  return files;
}

/**
 * Sync all files in a directory
 * @param {string} dirPath - Directory path
 * @param {object} config - App configuration
 * @returns {Promise<Array>} Array of sync results
 */
export async function syncDirectory(dirPath, config) {
  const token = await getToken();
  if (!token) {
    throw new Error('Not authenticated. Run "splitmark login" first.');
  }

  const apiUrl = getApiUrl(config);
  const results = [];

  try {
    // Get all .md files in directory and subdirectories recursively
    const files = scanDirectoryRecursive(dirPath);

    // Sync each file
    for (const filePath of files) {
      try {
        const result = await syncFile(filePath, dirPath, apiUrl, token, config);
        results.push(result);
      } catch (error) {
        results.push({
          action: 'error',
          filename: basename(filePath),
          error: error.message,
        });
      }
    }

    // Check for cloud-only files (files in cloud but not local)
    const cloudFiles = await listFiles(apiUrl, token);
    const localRelativePaths = files.map((f) => relative(dirPath, f).replace(/\\/g, '/'));

    for (const cloudFile of cloudFiles) {
      const cloudPath = cloudFile.relative_path || cloudFile.filename;
      if (!localRelativePaths.includes(cloudPath)) {
        // File exists in cloud but not locally
        // Optionally download it
        results.push({
          action: 'cloud_only',
          filename: cloudPath,
          cloudId: cloudFile.id,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Sync failed: ${error.message}`);
  }
}

/**
 * Perform full sync (main entry point)
 * @param {object} config - App configuration
 * @returns {Promise<object>} Sync summary
 */
export async function performSync(config) {
  const token = await getToken();
  if (!token) {
    throw new Error('Not authenticated. Run "splitmark login" first.');
  }

  const defaultLocation = config.defaultLocation;
  const results = await syncDirectory(defaultLocation, config);

  // Summarize results
  const summary = {
    total: results.length,
    uploaded: results.filter((r) => r.action === 'uploaded').length,
    updated: results.filter((r) => r.action === 'updated').length,
    downloaded: results.filter((r) => r.action === 'downloaded').length,
    conflicts: results.filter((r) => r.action === 'conflict').length,
    errors: results.filter((r) => r.action === 'error').length,
    noChange: results.filter((r) => r.action === 'no_change').length,
    cloudOnly: results.filter((r) => r.action === 'cloud_only').length,
    results,
  };

  return summary;
}

/**
 * Download a cloud-only file to local
 * @param {string} filename - File name
 * @param {string} destinationPath - Where to save the file
 * @param {object} config - App configuration
 * @returns {Promise<void>}
 */
export async function downloadCloudFile(filename, destinationPath, config) {
  const token = await getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const apiUrl = getApiUrl(config);
  const encryptionKey = getUserEncryptionKey();

  // Find file in cloud
  const cloudFiles = await listFiles(apiUrl, token);
  const cloudFile = cloudFiles.find((f) => (f.relative_path || f.filename) === filename);

  if (!cloudFile) {
    throw new Error(`File "${filename}" not found in cloud`);
  }

  // Download and decrypt
  const content = await downloadFromCloud(cloudFile.id, filename, apiUrl, token, encryptionKey);

  // Save to local
  writeFileSync(destinationPath, content, 'utf8');

  // Update sync state
  const contentHash = generateContentHash(content);
  markAsSynced(filename, cloudFile.id, contentHash, destinationPath);
}

export default {
  syncFile,
  syncDirectory,
  performSync,
  downloadCloudFile,
};
