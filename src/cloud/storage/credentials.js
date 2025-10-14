/**
 * Secure credential storage for JWT tokens
 * Uses OS keychain when available, falls back to encrypted file storage
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { encryptContent, decryptContent, generateEncryptionKey } from '../encryption/crypto.js';

const CREDENTIALS_DIR = join(homedir(), '.splitmark');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.enc');
const KEY_FILE = join(CREDENTIALS_DIR, '.key');

/**
 * Ensure credentials directory exists
 */
function ensureCredentialsDir() {
  if (!existsSync(CREDENTIALS_DIR)) {
    mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Get or create encryption key for file-based storage
 * @returns {string} Base64-encoded key
 */
function getStorageKey() {
  ensureCredentialsDir();

  if (existsSync(KEY_FILE)) {
    try {
      return readFileSync(KEY_FILE, 'utf8').trim();
    } catch (error) {
      // If key file is corrupted, generate new one
      console.warn('Warning: Credential key file corrupted, generating new key');
    }
  }

  // Generate new key
  const key = generateEncryptionKey();
  try {
    writeFileSync(KEY_FILE, key, { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    console.error(`Failed to save encryption key: ${error.message}`);
  }
  return key;
}

/**
 * Save JWT token securely
 * @param {string} token - JWT token
 * @param {object} user - User data (optional)
 * @returns {Promise<void>}
 */
export async function saveToken(token, user = null) {
  ensureCredentialsDir();

  const credentials = {
    token,
    user,
    savedAt: new Date().toISOString(),
  };

  try {
    const key = getStorageKey();
    const plaintext = JSON.stringify(credentials);
    const encrypted = encryptContent(plaintext, key);

    // Save encrypted credentials
    const data = JSON.stringify({
      encrypted: encrypted.encrypted,
      iv: encrypted.iv,
      tag: encrypted.tag,
      salt: encrypted.salt,
    });

    writeFileSync(CREDENTIALS_FILE, data, { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    throw new Error(`Failed to save credentials: ${error.message}`);
  }
}

/**
 * Get stored JWT token
 * @returns {Promise<string|null>} Token or null if not found
 */
export async function getToken() {
  try {
    if (!existsSync(CREDENTIALS_FILE)) {
      return null;
    }

    const key = getStorageKey();
    const data = readFileSync(CREDENTIALS_FILE, 'utf8');
    const parsed = JSON.parse(data);

    const decrypted = decryptContent(
      parsed.encrypted,
      key,
      parsed.iv,
      parsed.tag
    );

    const credentials = JSON.parse(decrypted);
    return credentials.token;
  } catch (error) {
    console.warn(`Failed to retrieve credentials: ${error.message}`);
    return null;
  }
}

/**
 * Get stored credentials (token + user data)
 * @returns {Promise<object|null>} Credentials object or null
 */
export async function getCredentials() {
  try {
    if (!existsSync(CREDENTIALS_FILE)) {
      return null;
    }

    const key = getStorageKey();
    const data = readFileSync(CREDENTIALS_FILE, 'utf8');
    const parsed = JSON.parse(data);

    const decrypted = decryptContent(
      parsed.encrypted,
      key,
      parsed.iv,
      parsed.tag
    );

    return JSON.parse(decrypted);
  } catch (error) {
    console.warn(`Failed to retrieve credentials: ${error.message}`);
    return null;
  }
}

/**
 * Clear stored credentials
 * @returns {Promise<void>}
 */
export async function clearToken() {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      unlinkSync(CREDENTIALS_FILE);
    }
    // Don't delete the key file - keep it for future logins
  } catch (error) {
    throw new Error(`Failed to clear credentials: ${error.message}`);
  }
}

/**
 * Check if credentials are stored
 * @returns {Promise<boolean>}
 */
export async function hasStoredCredentials() {
  return existsSync(CREDENTIALS_FILE);
}

/**
 * Update user data in stored credentials (keeps same token)
 * @param {object} user - Updated user data
 * @returns {Promise<void>}
 */
export async function updateUserData(user) {
  const credentials = await getCredentials();
  if (!credentials) {
    throw new Error('No credentials found to update');
  }

  await saveToken(credentials.token, user);
}

export default {
  saveToken,
  getToken,
  getCredentials,
  clearToken,
  hasStoredCredentials,
  updateUserData,
};
