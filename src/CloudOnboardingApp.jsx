/**
 * Cloud Onboarding CLI App wrapper
 * Renders the onboarding flow for CLI usage
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import CloudOnboarding from './components/cloud/CloudOnboarding.jsx';
import { markOnboardingCompleted } from './cloud/utils/onboardingCheck.js';
import { saveConfig } from './utils/config.js';

const CloudOnboardingApp = ({ config, onComplete, onCancel }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [setupResult, setSetupResult] = useState(null);

  const handleOnboardingComplete = (result) => {
    // Mark onboarding as completed in config
    const updatedConfig = markOnboardingCompleted(config);
    saveConfig(updatedConfig);

    setSetupResult(result);
    setShowSuccess(true);

    // Auto-close after showing success message
    setTimeout(() => {
      onComplete && onComplete(result);
    }, 3000);
  };

  const handleCancel = () => {
    onCancel && onCancel();
  };

  if (showSuccess && setupResult) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="green">🎉 Cloud Setup Complete!</Text>
        </Box>

        {setupResult.userInfo && (
          <Box marginBottom={1}>
            <Text>Welcome to Splitmark Cloud, {setupResult.userInfo.email}!</Text>
          </Box>
        )}

        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">Setup Summary:</Text>
          <Text>• Authentication: ✅ Complete</Text>
          <Text>• Premium Subscription: ✅ Active</Text>
          <Text>• Cloud Sync: ✅ Enabled</Text>
          <Text>• Sync-on-Save: ✅ Enabled</Text>
          {setupResult.syncResult && (
            <Text>• Files Synced: {setupResult.syncResult.total || 0}</Text>
          )}
        </Box>

        <Box marginTop={1}>
          <Text bold color="cyan">What's Next:</Text>
        </Box>
        <Box marginLeft={2}>
          <Text>• Start editing files - they'll sync automatically</Text>
          <Text>• Run "splitmark cloud:status" to see sync activity</Text>
          <Text>• Check out CLOUD.md for tips and troubleshooting</Text>
        </Box>

        <Box marginTop={1}>
          <Text color="green">Setup will close automatically...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <CloudOnboarding
      config={config}
      onComplete={handleOnboardingComplete}
      onCancel={handleCancel}
    />
  );
};

export default CloudOnboardingApp;