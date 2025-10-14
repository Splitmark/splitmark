/**
 * Sync Status CLI App wrapper
 * Renders the interactive sync status component for CLI usage
 */

import React from 'react';
import SyncStatus from './components/cloud/SyncStatus.jsx';

const SyncStatusApp = ({ config, onClose }) => {
  const handleClose = () => {
    onClose && onClose();
  };

  return (
    <SyncStatus
      config={config}
      onClose={handleClose}
    />
  );
};

export default SyncStatusApp;