/**
 * End-to-end encryption utilities for file content
 * All encryption happens client-side before transmission
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Generate a random encryption key
 * @returns {string} Base64-encoded key
 */
export function generateEncryptionKey() {
  return randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Derive a key from a password using PBKDF2
 * @param {string} password
 * @param {string} salt - Base64 encoded salt
 * @returns {Buffer} Derived key
 */
function deriveKey(password, salt) {
  const crypto = require('crypto');
  return crypto.pbkdf2Sync(
    password,
    Buffer.from(salt, 'base64'),
    100000,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypt content using AES-256-GCM
 * @param {string} plaintext
 * @param {string} key - Base64-encoded encryption key
 * @returns {object} { encrypted: string, iv: string, tag: string, salt: string }
 */
export function encryptContent(plaintext, key) {
  try {
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);
    const keyBuffer = Buffer.from(key, 'base64');

    const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt content using AES-256-GCM
 * @param {string} encrypted - Base64-encoded encrypted content
 * @param {string} key - Base64-encoded encryption key
 * @param {string} iv - Base64-encoded IV
 * @param {string} tag - Base64-encoded auth tag
 * @returns {string} Decrypted plaintext
 */
export function decryptContent(encrypted, key, iv, tag) {
  try {
    const keyBuffer = Buffer.from(key, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');

    const decipher = createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
    decipher.setAuthTag(tagBuffer);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generate SHA-256 hash of content for integrity verification
 * @param {string} content
 * @returns {string} Hex-encoded hash
 */
export function generateContentHash(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Encode encrypted data for transmission
 * Combines encrypted content, IV, tag, and salt into single base64 string
 * @param {object} encryptedData - Output from encryptContent()
 * @returns {string} Base64-encoded combined data
 */
export function encodeForTransmission(encryptedData) {
  const combined = JSON.stringify({
    data: encryptedData.encrypted,
    iv: encryptedData.iv,
    tag: encryptedData.tag,
    salt: encryptedData.salt,
  });
  return Buffer.from(combined).toString('base64');
}

/**
 * Decode data received from server
 * @param {string} encoded - Base64-encoded combined data
 * @returns {object} { encrypted, iv, tag, salt }
 */
export function decodeFromTransmission(encoded) {
  try {
    // First, try to parse as direct JSON (new format)
    try {
      const parsed = JSON.parse(encoded);
      // If it parses successfully and has the expected structure, use it
      if (parsed && typeof parsed === 'object' && 'data' in parsed) {
        return {
          encrypted: parsed.data,
          iv: parsed.iv,
          tag: parsed.tag,
          salt: parsed.salt,
        };
      }
    } catch (directJsonError) {
      // Not direct JSON, try base64 decode approach (old format)
    }

    // Fallback to old format: base64-encoded JSON
    const combined = Buffer.from(encoded, 'base64').toString('utf8');
    const parsed = JSON.parse(combined);
    return {
      encrypted: parsed.data,
      iv: parsed.iv,
      tag: parsed.tag,
      salt: parsed.salt,
    };
  } catch (error) {
    // Enhanced error message with more debugging info
    const preview = encoded.substring(0, 20);
    throw new Error(`Failed to decode transmission data: ${error.message}. Content preview: ${preview}...`);
  }
}

/**
 * Verify content hash matches
 * @param {string} content
 * @param {string} expectedHash
 * @returns {boolean}
 */
export function verifyContentHash(content, expectedHash) {
  const actualHash = generateContentHash(content);
  return actualHash === expectedHash;
}

/**
 * Full encryption workflow for uploading
 * @param {string} plaintext
 * @param {string} key
 * @returns {object} { content: string, contentHash: string }
 */
export function encryptForUpload(plaintext, key) {
  const contentHash = generateContentHash(plaintext);
  const encrypted = encryptContent(plaintext, key);
  const content = encodeForTransmission(encrypted);

  return {
    content,
    contentHash,
  };
}

/**
 * Full decryption workflow for downloading
 * @param {string} encodedContent
 * @param {string} key
 * @param {string} expectedHash
 * @returns {string} Decrypted plaintext
 * @throws {Error} If hash verification fails
 */
export function decryptFromDownload(encodedContent, key, expectedHash) {
  const decoded = decodeFromTransmission(encodedContent);
  const plaintext = decryptContent(decoded.encrypted, key, decoded.iv, decoded.tag);

  // Verify integrity
  if (!verifyContentHash(plaintext, expectedHash)) {
    throw new Error('Content hash verification failed - data may be corrupted');
  }

  return plaintext;
}

export default {
  generateEncryptionKey,
  encryptContent,
  decryptContent,
  generateContentHash,
  verifyContentHash,
  encodeForTransmission,
  decodeFromTransmission,
  encryptForUpload,
  decryptFromDownload,
};
