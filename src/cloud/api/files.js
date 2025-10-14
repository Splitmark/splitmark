/**
 * File management API methods
 * Handles file upload, download, update, and deletion
 */

import SplitmarkAPIClient from './client.js';
import { checkStorageQuota } from '../storage/storageValidation.js';
import { checkSubscriptionStatus } from '../subscription/subscriptionCheck.js';

/**
 * List all user's files
 * @param {string} baseUrl - API base URL
 * @param {string} token - JWT token
 * @returns {Promise<Array>} Array of file metadata
 */
export async function listFiles(baseUrl, token) {
  const client = new SplitmarkAPIClient(baseUrl, token);

  try {
    const response = await client.get('/files');
    return response.files || [];
  } catch (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Upload a new file
 * @param {string} baseUrl - API base URL
 * @param {string} token - JWT token
 * @param {string} filename - File name
 * @param {string} encryptedContent - Base64-encoded encrypted content
 * @param {string} contentHash - SHA-256 hash of plaintext
 * @param {object} config - App configuration (optional, for storage validation)
 * @returns {Promise<object>} Created file metadata
 */
export async function uploadFile(baseUrl, token, filename, encryptedContent, contentHash, config = null) {
  const client = new SplitmarkAPIClient(baseUrl, token);

  // Optional client-side storage validation if config is provided
  if (config) {
    try {
      const subscriptionResult = await checkSubscriptionStatus(config);
      if (subscriptionResult.user?.isPremium) {
        const fileSize = Buffer.byteLength(encryptedContent, 'base64');
        const storageCheck = await checkStorageQuota(config, token, fileSize, subscriptionResult.user);

        if (!storageCheck.canUpload) {
          throw new Error(`Upload blocked: ${storageCheck.reason}`);
        }
      }
    } catch (validationError) {
      // If validation fails, log warning but continue (server will validate)
      console.warn('Client-side storage validation failed:', validationError.message);
    }
  }

  try {
    const response = await client.post(
      '/files',
      {
        filename,
        content: encryptedContent,
        contentHash,
      },
      { rateLimitType: 'files' }
    );

    return response.file;
  } catch (error) {
    // Check if it's a storage limit error from the server
    if (error.message.includes('storage') || error.message.includes('quota') || error.message.includes('limit')) {
      throw new Error(`Upload failed: Storage limit exceeded. Please delete some files or upgrade your plan.`);
    }
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Download a file
 * @param {string} baseUrl - API base URL
 * @param {string} token - JWT token
 * @param {string} fileId - File ID
 * @returns {Promise<object>} File data with encrypted content
 */
export async function downloadFile(baseUrl, token, fileId) {
  const client = new SplitmarkAPIClient(baseUrl, token);

  try {
    const response = await client.get(`/files/${fileId}?includeContent=true`);
    return response.file;
  } catch (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

/**
 * Update an existing file
 * @param {string} baseUrl - API base URL
 * @param {string} token - JWT token
 * @param {string} fileId - File ID
 * @param {string} encryptedContent - Base64-encoded encrypted content
 * @param {string} contentHash - SHA-256 hash of plaintext
 * @param {object} config - App configuration (optional, for storage validation)
 * @returns {Promise<object>} Updated file metadata
 */
export async function updateFile(baseUrl, token, fileId, encryptedContent, contentHash, config = null) {
  const client = new SplitmarkAPIClient(baseUrl, token);

  // Optional client-side storage validation if config is provided
  // Note: For updates, we're more lenient since they might reduce file size
  if (config) {
    try {
      const subscriptionResult = await checkSubscriptionStatus(config);
      if (subscriptionResult.user?.isPremium) {
        const fileSize = Buffer.byteLength(encryptedContent, 'base64');
        const storageCheck = await checkStorageQuota(config, token, fileSize, subscriptionResult.user);

        // For updates, only block if storage is severely exceeded (>110%)
        const percentUsed = (storageCheck.usage?.used || 0) / (storageCheck.usage?.limit || 1);
        if (percentUsed > 1.1) {
          console.warn('⚠️ Storage severely exceeded, update may fail on server');
        }
      }
    } catch (validationError) {
      // If validation fails, log warning but continue
      console.warn('Client-side storage validation failed:', validationError.message);
    }
  }

  try {
    const response = await client.put(
      `/files/${fileId}`,
      {
        content: encryptedContent,
        contentHash,
      },
      { rateLimitType: 'files' }
    );

    return response.file;
  } catch (error) {
    // Check if it's a storage limit error from the server
    if (error.message.includes('storage') || error.message.includes('quota') || error.message.includes('limit')) {
      throw new Error(`Update failed: Storage limit exceeded. Please delete some files to free up space.`);
    }
    throw new Error(`Failed to update file: ${error.message}`);
  }
}

/**
 * Delete a file
 * @param {string} baseUrl - API base URL
 * @param {string} token - JWT token
 * @param {string} fileId - File ID
 * @returns {Promise<void>}
 */
export async function deleteFile(baseUrl, token, fileId) {
  const client = new SplitmarkAPIClient(baseUrl, token);

  try {
    await client.delete(`/files/${fileId}`);
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

export default {
  listFiles,
  uploadFile,
  downloadFile,
  updateFile,
  deleteFile,
};
