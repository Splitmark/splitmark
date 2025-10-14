/**
 * Encryption key manager
 * Manages per-user encryption keys securely
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { generateEncryptionKey } from './crypto.js';

const KEY_DIR = join(homedir(), '.splitmark');
const KEY_FILE = join(KEY_DIR, 'encryption-key');

/**
 * Ensure key directory exists
 */
function ensureKeyDir() {
  if (!existsSync(KEY_DIR)) {
    mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Get user's encryption key (generate if doesn't exist)
 * @returns {string} Base64-encoded encryption key
 */
export function getUserEncryptionKey() {
  ensureKeyDir();

  if (existsSync(KEY_FILE)) {
    try {
      return readFileSync(KEY_FILE, 'utf8').trim();
    } catch (error) {
      console.warn('Warning: Encryption key file corrupted, generating new key');
    }
  }

  // Generate new key
  const key = generateEncryptionKey();
  try {
    writeFileSync(KEY_FILE, key, { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    throw new Error(`Failed to save encryption key: ${error.message}`);
  }

  return key;
}

/**
 * Check if encryption key exists
 * @returns {boolean}
 */
export function hasEncryptionKey() {
  return existsSync(KEY_FILE);
}

/**
 * Clear encryption key (use with caution!)
 * This will make all encrypted cloud data unrecoverable
 */
export function clearEncryptionKey() {
  if (existsSync(KEY_FILE)) {
    const fs = require('fs');
    fs.unlinkSync(KEY_FILE);
  }
}

export default {
  getUserEncryptionKey,
  hasEncryptionKey,
  clearEncryptionKey,
};
