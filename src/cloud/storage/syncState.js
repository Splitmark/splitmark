/**
 * Sync state management
 * Tracks synchronization state for each file
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SYNC_STATE_DIR = join(homedir(), '.splitmark');
const SYNC_STATE_FILE = join(SYNC_STATE_DIR, 'sync-state.json');

/**
 * Ensure sync state directory exists
 */
function ensureSyncStateDir() {
  if (!existsSync(SYNC_STATE_DIR)) {
    mkdirSync(SYNC_STATE_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load sync state from file
 * @returns {object} Sync state map
 */
export function loadSyncState() {
  try {
    if (!existsSync(SYNC_STATE_FILE)) {
      return {};
    }

    const data = readFileSync(SYNC_STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Failed to load sync state: ${error.message}`);
    return {};
  }
}

/**
 * Save sync state to file
 * @param {object} state - Sync state map
 */
export function saveSyncState(state) {
  try {
    ensureSyncStateDir();
    const data = JSON.stringify(state, null, 2);
    writeFileSync(SYNC_STATE_FILE, data, { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    throw new Error(`Failed to save sync state: ${error.message}`);
  }
}

/**
 * Get file state
 * @param {string} filename - File name (not full path)
 * @returns {object|null} File state or null if not found
 */
export function getFileState(filename) {
  const state = loadSyncState();
  return state[filename] || null;
}

/**
 * Update file state
 * @param {string} filename - File name (not full path)
 * @param {object} updates - State updates
 */
export function updateFileState(filename, updates) {
  const state = loadSyncState();
  state[filename] = {
    ...(state[filename] || {}),
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  saveSyncState(state);
}

/**
 * Mark file as synced
 * @param {string} filename - File name
 * @param {string} cloudId - Cloud file ID
 * @param {string} contentHash - Content hash
 * @param {string} localPath - Local file path
 */
export function markAsSynced(filename, cloudId, contentHash, localPath) {
  updateFileState(filename, {
    localPath,
    cloudId,
    lastSyncedHash: contentHash,
    lastSyncedAt: new Date().toISOString(),
    syncStatus: 'synced',
    error: null,
  });
}

/**
 * Mark file as pending sync
 * @param {string} filename - File name
 * @param {string} localPath - Local file path
 */
export function markAsPending(filename, localPath) {
  updateFileState(filename, {
    localPath,
    syncStatus: 'pending',
  });
}

/**
 * Mark file as having conflict
 * @param {string} filename - File name
 * @param {string} message - Conflict description
 */
export function markAsConflict(filename, message) {
  updateFileState(filename, {
    syncStatus: 'conflict',
    conflictMessage: message,
  });
}

/**
 * Mark file as having error
 * @param {string} filename - File name
 * @param {string} error - Error message
 */
export function markAsError(filename, error) {
  updateFileState(filename, {
    syncStatus: 'error',
    error: error,
  });
}

/**
 * Remove file from sync state
 * @param {string} filename - File name
 */
export function removeFileState(filename) {
  const state = loadSyncState();
  delete state[filename];
  saveSyncState(state);
}

/**
 * Get all files in sync state
 * @returns {Array} Array of { filename, state } objects
 */
export function getAllFileStates() {
  const state = loadSyncState();
  return Object.entries(state).map(([filename, fileState]) => ({
    filename,
    ...fileState,
  }));
}

/**
 * Get files by sync status
 * @param {string} status - Sync status to filter by
 * @returns {Array} Array of { filename, state } objects
 */
export function getFilesByStatus(status) {
  const allFiles = getAllFileStates();
  return allFiles.filter((file) => file.syncStatus === status);
}

/**
 * Clear all sync state
 */
export function clearSyncState() {
  saveSyncState({});
}

export default {
  loadSyncState,
  saveSyncState,
  getFileState,
  updateFileState,
  markAsSynced,
  markAsPending,
  markAsConflict,
  markAsError,
  removeFileState,
  getAllFileStates,
  getFilesByStatus,
  clearSyncState,
};
