/**
 * Conflict resolution utilities
 * Helps users resolve sync conflicts
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { basename, join, dirname } from 'path';
import { generateContentHash } from '../encryption/crypto.js';
import { markAsSynced, getFileState } from '../storage/syncState.js';
import { downloadFile } from '../api/files.js';
import { decryptFromDownload } from '../encryption/crypto.js';
import { getUserEncryptionKey } from '../encryption/keyManager.js';

/**
 * Conflict resolution strategies
 */
export const ResolutionStrategy = {
  KEEP_LOCAL: 'keep_local',
  KEEP_CLOUD: 'keep_cloud',
  KEEP_BOTH: 'keep_both',
  MANUAL: 'manual',
};

/**
 * Resolve a conflict by keeping local version
 * @param {string} filename - File name
 * @param {string} localPath - Local file path
 * @param {string} cloudId - Cloud file ID
 * @param {string} apiUrl - API base URL
 * @param {string} token - JWT token
 * @returns {Promise<object>} Resolution result
 */
export async function resolveKeepLocal(filename, localPath, cloudId, apiUrl, token) {
  try {
    // Read local file and upload to cloud
    const localContent = readFileSync(localPath, 'utf8');
    const localHash = generateContentHash(localContent);
    const encryptionKey = getUserEncryptionKey();

    const { encryptForUpload } = await import('../encryption/crypto.js');
    const { content: encryptedContent } = encryptForUpload(localContent, encryptionKey);

    const { updateFile } = await import('../api/files.js');
    await updateFile(apiUrl, token, cloudId, encryptedContent, localHash);

    // Update sync state
    markAsSynced(filename, cloudId, localHash, localPath);

    return {
      strategy: ResolutionStrategy.KEEP_LOCAL,
      filename,
      message: 'Kept local version and uploaded to cloud',
    };
  } catch (error) {
    throw new Error(`Failed to resolve conflict (keep local): ${error.message}`);
  }
}

/**
 * Resolve a conflict by keeping cloud version
 * @param {string} filename - File name
 * @param {string} localPath - Local file path
 * @param {string} cloudId - Cloud file ID
 * @param {string} apiUrl - API base URL
 * @param {string} token - JWT token
 * @returns {Promise<object>} Resolution result
 */
export async function resolveKeepCloud(filename, localPath, cloudId, apiUrl, token) {
  try {
    // Download cloud file and overwrite local
    const encryptionKey = getUserEncryptionKey();
    const cloudFile = await downloadFile(apiUrl, token, cloudId);
    const cloudContent = decryptFromDownload(
      cloudFile.content,
      encryptionKey,
      cloudFile.contentHash
    );

    // Backup local version first
    const backupPath = `${localPath}.backup`;
    copyFileSync(localPath, backupPath);

    // Overwrite with cloud version
    writeFileSync(localPath, cloudContent, 'utf8');

    // Update sync state
    markAsSynced(filename, cloudId, cloudFile.contentHash, localPath);

    return {
      strategy: ResolutionStrategy.KEEP_CLOUD,
      filename,
      backupPath,
      message: `Kept cloud version, local backup saved to ${backupPath}`,
    };
  } catch (error) {
    throw new Error(`Failed to resolve conflict (keep cloud): ${error.message}`);
  }
}

/**
 * Resolve a conflict by keeping both versions
 * @param {string} filename - File name
 * @param {string} localPath - Local file path
 * @param {string} cloudId - Cloud file ID
 * @param {string} apiUrl - API base URL
 * @param {string} token - JWT token
 * @returns {Promise<object>} Resolution result
 */
export async function resolveKeepBoth(filename, localPath, cloudId, apiUrl, token) {
  try {
    // Download cloud version to a separate file
    const encryptionKey = getUserEncryptionKey();
    const cloudFile = await downloadFile(apiUrl, token, cloudId);
    const cloudContent = decryptFromDownload(
      cloudFile.content,
      encryptionKey,
      cloudFile.contentHash
    );

    // Save cloud version with suffix
    const dir = dirname(localPath);
    const base = basename(localPath, '.md');
    const cloudPath = join(dir, `${base}.cloud.md`);
    writeFileSync(cloudPath, cloudContent, 'utf8');

    // Rename local version with suffix
    const localNewPath = join(dir, `${base}.local.md`);
    copyFileSync(localPath, localNewPath);

    return {
      strategy: ResolutionStrategy.KEEP_BOTH,
      filename,
      localPath: localNewPath,
      cloudPath,
      message: `Kept both versions:\n  Local: ${localNewPath}\n  Cloud: ${cloudPath}\nPlease merge manually and sync again.`,
    };
  } catch (error) {
    throw new Error(`Failed to resolve conflict (keep both): ${error.message}`);
  }
}

/**
 * Get conflict details for display
 * @param {string} filename - File name
 * @param {string} localPath - Local file path
 * @param {string} cloudId - Cloud file ID
 * @param {string} apiUrl - API base URL
 * @param {string} token - JWT token
 * @returns {Promise<object>} Conflict details
 */
export async function getConflictDetails(filename, localPath, cloudId, apiUrl, token) {
  try {
    const localContent = readFileSync(localPath, 'utf8');
    const localHash = generateContentHash(localContent);
    const localModified = statSync(localPath).mtime;

    const encryptionKey = getUserEncryptionKey();
    const cloudFile = await downloadFile(apiUrl, token, cloudId);
    const cloudContent = decryptFromDownload(
      cloudFile.content,
      encryptionKey,
      cloudFile.contentHash
    );
    const cloudModified = new Date(cloudFile.updatedAt);

    return {
      filename,
      local: {
        hash: localHash,
        modified: localModified,
        size: localContent.length,
        preview: localContent.substring(0, 200),
      },
      cloud: {
        hash: cloudFile.contentHash,
        modified: cloudModified,
        size: cloudContent.length,
        preview: cloudContent.substring(0, 200),
      },
    };
  } catch (error) {
    throw new Error(`Failed to get conflict details: ${error.message}`);
  }
}

export default {
  ResolutionStrategy,
  resolveKeepLocal,
  resolveKeepCloud,
  resolveKeepBoth,
  getConflictDetails,
};
