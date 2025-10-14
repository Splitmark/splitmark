/**
 * Auto-sync service - Watches for file changes and automatically syncs to cloud
 */

import { watch } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { syncFile } from './syncEngine.js';
import { getToken } from '../storage/credentials.js';
import { getApiUrl } from '../../utils/cloudConfig.js';

let watchers = new Map();
let isWatching = false;
let config = null;

/**
 * Start auto-sync for a directory
 * @param {string} dirPath - Directory to watch
 * @param {object} appConfig - App configuration
 * @returns {Promise<void>}
 */
export async function startAutoSync(dirPath, appConfig) {
  if (isWatching) {
    return;
  }

  const token = await getToken();
  if (!token) {
    throw new Error('Not authenticated. Cannot start auto-sync.');
  }

  config = appConfig;
  isWatching = true;


  try {
    // Watch the directory recursively
    const watcher = watch(dirPath, { recursive: true }, async (eventType, filename) => {
      if (!filename || !filename.endsWith('.md')) {
        return; // Only watch .md files
      }

      const fullPath = join(dirPath, filename);

      // Skip if file doesn't exist (deleted files)
      if (!existsSync(fullPath)) {
        return;
      }


      try {
        // Debounce: wait a bit to avoid multiple rapid saves
        const debounceKey = fullPath;
        if (watchers.has(debounceKey)) {
          clearTimeout(watchers.get(debounceKey));
        }

        const timeoutId = setTimeout(async () => {
          try {
            const token = await getToken();
            if (!token) {
              console.warn('Not authenticated, skipping auto-sync');
              return;
            }

            const apiUrl = getApiUrl(config);
            const result = await syncFile(fullPath, dirPath, apiUrl, token);

            if (result.action === 'conflict') {
              console.warn(`Sync conflict: ${result.filename}`);
            }
          } catch (error) {
            console.error(`Auto-sync failed for ${filename}:`, error.message);
          } finally {
            watchers.delete(debounceKey);
          }
        }, 1000); // 1 second debounce

        watchers.set(debounceKey, timeoutId);

      } catch (error) {
        console.error(`Auto-sync error for ${filename}:`, error.message);
      }
    });

    watchers.set('main', watcher);

  } catch (error) {
    isWatching = false;
    console.error('Failed to start auto-sync:', error.message);
    throw error;
  }
}

/**
 * Stop auto-sync
 */
export function stopAutoSync() {
  if (!isWatching) {
    return;
  }


  // Clear all watchers and timeouts
  for (const [key, value] of watchers.entries()) {
    if (key === 'main') {
      value.close(); // File watcher
    } else {
      clearTimeout(value); // Timeout
    }
  }

  watchers.clear();
  isWatching = false;
  config = null;

}

/**
 * Check if auto-sync is running
 * @returns {boolean}
 */
export function isAutoSyncRunning() {
  return isWatching;
}

/**
 * Get auto-sync status
 * @returns {object}
 */
export function getAutoSyncStatus() {
  return {
    isRunning: isWatching,
    watchersCount: watchers.size,
    config: config ? { defaultLocation: config.defaultLocation } : null
  };
}

export default {
  startAutoSync,
  stopAutoSync,
  isAutoSyncRunning,
  getAutoSyncStatus
};