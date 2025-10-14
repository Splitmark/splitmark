/**
 * Sync Status Component - Displays detailed sync status information
 * Shows list of files, their sync status, last sync time, and any errors
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { getAllFileStates, getFilesByStatus } from '../../cloud/storage/syncState.js';
import { getSyncOnSaveStatus } from '../../cloud/sync/syncOnSave.js';
import { getStorageUsage, formatStorageInfo } from '../../cloud/storage/storageValidation.js';
import { checkSubscriptionStatus } from '../../cloud/subscription/subscriptionCheck.js';
import { getToken } from '../../cloud/storage/credentials.js';

const SyncStatus = ({ config, onClose }) => {
  const [syncFiles, setSyncFiles] = useState([]);
  const [syncStatus, setSyncStatus] = useState({});
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load sync status on component mount
  useEffect(() => {
    loadSyncData();
  }, []);

  const loadSyncData = useCallback(async () => {
    try {
      setLoading(true);

      // Get all file states
      const allFiles = getAllFileStates();
      setSyncFiles(Object.entries(allFiles).map(([path, state]) => ({ path, ...state })));

      // Get sync-on-save status
      const status = await getSyncOnSaveStatus();
      setSyncStatus(status);

      // Get storage information if available
      if (status.hasSubscription) {
        try {
          const token = await getToken();
          if (token) {
            const usage = await getStorageUsage(config, token);
            setStorageInfo(usage);
          }
        } catch (error) {
          // Storage info is optional
        }
      }
    } catch (error) {
      console.error('Failed to load sync data:', error);
    } finally {
      setLoading(false);
    }
  }, [config]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(syncFiles.length - 1, selectedIndex + 1));
    } else if (input === 'r') {
      loadSyncData();
    }
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'synced': return '✅';
      case 'pending': return '⏳';
      case 'conflict': return '⚠️ ';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'synced': return 'green';
      case 'pending': return 'yellow';
      case 'conflict': return 'magenta';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">☁️  Splitmark Cloud Sync Status</Text>
        <Text color="yellow">Loading sync information...</Text>
      </Box>
    );
  }

  // Get status summary
  const syncedCount = syncFiles.filter(f => f.syncStatus === 'synced').length;
  const pendingCount = syncFiles.filter(f => f.syncStatus === 'pending').length;
  const conflictCount = syncFiles.filter(f => f.syncStatus === 'conflict').length;
  const errorCount = syncFiles.filter(f => f.syncStatus === 'error').length;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Text bold color="cyan">☁️  Splitmark Cloud Sync Status</Text>
      <Text color="gray">Press 'q' or ESC to close, 'r' to refresh, ↑↓ to navigate</Text>
      <Text> </Text>

      {/* Account Status */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Account Status:</Text>
        <Text>
          • Authentication: {syncStatus.authenticated ? '✅ Logged in' : '❌ Not logged in'}
        </Text>
        <Text>
          • Cloud Sync: {syncStatus.enabled ? '✅ Enabled' : '❌ Disabled'}
        </Text>
        <Text>
          • Premium: {syncStatus.hasSubscription ? '✅ Active' : '❌ Required'}
        </Text>
        <Text>
          • Sync Available: {syncStatus.available ? '✅ Ready' : '❌ Unavailable'}
        </Text>
      </Box>

      {/* Storage Information */}
      {storageInfo && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Storage Usage:</Text>
          <Text>• {formatStorageInfo(storageInfo)}</Text>
          {storageInfo.used / storageInfo.limit > 0.8 && (
            <Text color="yellow">• ⚠️  Storage over 80% full</Text>
          )}
        </Box>
      )}

      {/* Sync Summary */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Sync Summary ({syncFiles.length} files):</Text>
        <Text>• ✅ Synced: {syncedCount}</Text>
        {pendingCount > 0 && <Text color="yellow">• ⏳ Pending: {pendingCount}</Text>}
        {conflictCount > 0 && <Text color="magenta">• ⚠️  Conflicts: {conflictCount}</Text>}
        {errorCount > 0 && <Text color="red">• ❌ Errors: {errorCount}</Text>}
      </Box>

      {/* File List */}
      {syncFiles.length > 0 ? (
        <Box flexDirection="column">
          <Text bold>Files:</Text>
          {syncFiles.slice(0, 10).map((file, index) => (
            <Box key={file.path} flexDirection="row">
              <Text color={selectedIndex === index ? 'inverse' : undefined}>
                {getStatusIcon(file.syncStatus)} {file.path}
              </Text>
              <Text color="gray"> • {formatDate(file.lastSyncedAt)}</Text>
            </Box>
          ))}
          {syncFiles.length > 10 && (
            <Text color="gray">... and {syncFiles.length - 10} more files</Text>
          )}
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text color="gray">No synced files found.</Text>
          {syncStatus.available && (
            <Text color="yellow">💡 Files will appear here after you save and sync them.</Text>
          )}
          {!syncStatus.available && !syncStatus.hasSubscription && (
            <Text color="yellow">💡 Upgrade to Premium to enable cloud sync.</Text>
          )}
        </Box>
      )}

      {/* Conflicts Detail */}
      {conflictCount > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="magenta">Conflict Details:</Text>
          {syncFiles
            .filter(f => f.syncStatus === 'conflict')
            .slice(0, 3)
            .map(file => (
              <Box key={file.path} flexDirection="column">
                <Text color="magenta">⚠️  {file.path}</Text>
                <Text color="gray">   {file.conflictMessage || 'Sync conflict detected'}</Text>
              </Box>
            ))}
          {conflictCount > 3 && (
            <Text color="gray">   ... and {conflictCount - 3} more conflicts</Text>
          )}
          <Text color="yellow">💡 Run "splitmark cloud:conflicts" for resolution options</Text>
        </Box>
      )}

      {/* Error Details */}
      {errorCount > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="red">Error Details:</Text>
          {syncFiles
            .filter(f => f.syncStatus === 'error')
            .slice(0, 3)
            .map(file => (
              <Box key={file.path} flexDirection="column">
                <Text color="red">❌ {file.path}</Text>
                <Text color="gray">   {file.errorMessage || 'Sync error occurred'}</Text>
              </Box>
            ))}
          {errorCount > 3 && (
            <Text color="gray">   ... and {errorCount - 3} more errors</Text>
          )}
          <Text color="yellow">💡 Try running "splitmark sync" to retry failed syncs</Text>
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text color="gray">
          💡 Cloud sync happens automatically when you save files. Run "splitmark cloud:status" for account info.
        </Text>
      </Box>
    </Box>
  );
};

export default SyncStatus;