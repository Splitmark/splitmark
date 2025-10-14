/**
 * Cloud authentication app wrapper
 * Renders the login prompt and handles authentication flow
 */

import React from 'react';
import { Box } from 'ink';
import LoginPrompt from './components/cloud/LoginPrompt.jsx';

const CloudAuthApp = ({ config, onSuccess, onCancel }) => {
  return (
    <Box flexDirection="column">
      <LoginPrompt
        config={config}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Box>
  );
};

export default CloudAuthApp;
