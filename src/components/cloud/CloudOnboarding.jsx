/**
 * Cloud Onboarding Flow Component
 * Guides first-time users through complete cloud setup process
 * Includes authentication, subscription check, initial sync, and tips
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { hasStoredCredentials, getCredentials } from '../../cloud/storage/credentials.js';
import { checkSubscriptionStatus } from '../../cloud/subscription/subscriptionCheck.js';
import { getAllFileStates } from '../../cloud/storage/syncState.js';
import { getCloudConfig, updateCloudConfig } from '../../utils/cloudConfig.js';
import { performSync } from '../../cloud/sync/syncEngine.js';
import LoginPrompt from './LoginPrompt.jsx';

const CloudOnboarding = ({ config, onComplete, onCancel }) => {
  const [step, setStep] = useState('welcome'); // welcome, login, subscription, sync-setup, initial-sync, tips, complete
  const [userInfo, setUserInfo] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if user is already set up
  useEffect(() => {
    checkExistingSetup();
  }, []);

  const checkExistingSetup = async () => {
    try {
      const isLoggedIn = await hasStoredCredentials();
      if (isLoggedIn) {
        const credentials = await getCredentials();
        setUserInfo(credentials.user);

        const subscription = await checkSubscriptionStatus(config);
        setSubscriptionInfo(subscription);

        // Check if they have any synced files
        const fileStates = getAllFileStates();
        const hasSyncedFiles = Object.keys(fileStates).length > 0;

        if (subscription.hasSubscription && hasSyncedFiles) {
          // User is fully set up, skip to tips
          setStep('tips');
        } else if (subscription.hasSubscription) {
          // Has subscription but no synced files
          setStep('initial-sync');
        } else if (isLoggedIn) {
          // Logged in but no subscription
          setStep('subscription');
        }
      }
    } catch (error) {
      console.warn('Could not check existing setup:', error.message);
    }
  };

  const handleLogin = async (loginResult) => {
    setUserInfo(loginResult.user);
    setStep('subscription');
  };

  const handleSubscriptionCheck = async () => {
    setLoading(true);
    try {
      const subscription = await checkSubscriptionStatus(config);
      setSubscriptionInfo(subscription);

      if (subscription.hasSubscription) {
        setStep('sync-setup');
      } else {
        setStep('subscription');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSetup = () => {
    // Enable cloud sync and sync-on-save by default for new users
    const cloudConfig = getCloudConfig(config);
    const updatedConfig = updateCloudConfig(config, {
      ...cloudConfig,
      enabled: true,
      autoSync: true // This enables sync-on-save
    });

    // Save the config
    config.cloud = updatedConfig.cloud;
    setStep('initial-sync');
  };

  const handleInitialSync = async () => {
    setLoading(true);
    setSyncResult(null);
    setError(null);

    try {
      const result = await performSync(config);
      setSyncResult(result);
      setStep('complete');
    } catch (err) {
      setError(err.message);
      setSyncResult({ total: 0, errors: 1 });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipSync = () => {
    setStep('complete');
  };

  const handleComplete = () => {
    onComplete && onComplete({
      userInfo,
      subscriptionInfo,
      syncResult,
      cloudEnabled: true
    });
  };

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (step === 'welcome') {
        onCancel && onCancel();
      } else {
        // Allow canceling at any step
        onCancel && onCancel();
      }
      return;
    }

    // Step-specific navigation
    if (step === 'welcome' && key.return) {
      setStep('login');
    } else if (step === 'subscription' && subscriptionInfo?.hasSubscription && key.return) {
      setStep('sync-setup');
    } else if (step === 'sync-setup' && key.return) {
      handleSyncSetup();
    } else if (step === 'initial-sync' && key.return) {
      handleInitialSync();
    } else if (step === 'initial-sync' && input === 's') {
      handleSkipSync();
    } else if (step === 'complete' && key.return) {
      handleComplete();
    } else if (step === 'tips' && key.return) {
      handleComplete();
    }
  });

  // Welcome Screen
  if (step === 'welcome') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">☁️  Welcome to Splitmark Cloud</Text>
        </Box>

        <Text>Let's set up cloud sync for your markdown files!</Text>

        <Box marginTop={1} marginBottom={1}>
          <Text bold>What you'll get:</Text>
        </Box>

        <Box flexDirection="column" marginLeft={2}>
          <Text>• 🔒 End-to-end encrypted file storage</Text>
          <Text>• 🔄 Automatic sync when you save files</Text>
          <Text>• 📱 Access your files from any device</Text>
          <Text>• 🧠 Smart conflict resolution</Text>
          <Text>• 💾 10GB of secure cloud storage</Text>
        </Box>

        <Box marginTop={2}>
          <Text bold>Ready to get started?</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Press Enter to continue • ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Login Step
  if (step === 'login') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">Step 1: Authentication</Text>
        </Box>
        <LoginPrompt
          config={config}
          onSuccess={handleLogin}
          onCancel={() => setStep('welcome')}
        />
      </Box>
    );
  }

  // Subscription Check
  if (step === 'subscription') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">Step 2: Premium Subscription</Text>
        </Box>

        {userInfo && (
          <Box marginBottom={1}>
            <Text color="green">✓ Logged in as: {userInfo.email}</Text>
          </Box>
        )}

        {loading && (
          <Box marginTop={1}>
            <Text color="yellow">⏳ Checking subscription status...</Text>
          </Box>
        )}

        {subscriptionInfo && !loading && (
          <>
            {subscriptionInfo.hasSubscription ? (
              <Box flexDirection="column" marginTop={1}>
                <Text color="green">✓ Premium subscription active!</Text>
                <Text>You have access to 10GB of encrypted cloud storage.</Text>
                <Box marginTop={1}>
                  <Text bold>Press Enter to continue with setup</Text>
                </Box>
              </Box>
            ) : (
              <Box flexDirection="column" marginTop={1}>
                <Text color="yellow">⚠️  Premium subscription required</Text>
                <Text>Cloud sync requires a Premium subscription for secure storage.</Text>

                <Box marginTop={1} marginBottom={1}>
                  <Text bold>To upgrade:</Text>
                  <Text>1. Visit https://splitmark.app/dashboard</Text>
                  <Text>2. Choose Premium plan</Text>
                  <Text>3. Return here and run setup again</Text>
                </Box>

                <Box marginTop={1}>
                  <Text dimColor>Press R to recheck • ESC to cancel</Text>
                </Box>
              </Box>
            )}
          </>
        )}

        {error && (
          <Box marginTop={1}>
            <Text color="red">✗ {error}</Text>
            <Box marginTop={1}>
              <Text dimColor>Press R to retry • ESC to cancel</Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  // Sync Setup Configuration
  if (step === 'sync-setup') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">Step 3: Configure Sync</Text>
        </Box>

        <Text>Great! Let's configure your cloud sync preferences:</Text>

        <Box marginTop={1} marginBottom={1} flexDirection="column">
          <Text>✅ <Text bold>Cloud Sync:</Text> Enabled</Text>
          <Text>✅ <Text bold>Sync-on-Save:</Text> Enabled</Text>
          <Text color="gray">   (Files automatically sync when you save them)</Text>
          <Text>✅ <Text bold>Encryption:</Text> End-to-end encryption enabled</Text>
          <Text>✅ <Text bold>Storage Limit:</Text> 10GB Premium storage</Text>
        </Box>

        <Box marginTop={1}>
          <Text bold>Directory: <Text color="cyan">{config.defaultLocation}</Text></Text>
          <Text dimColor>All .md files in this directory will be synced</Text>
        </Box>

        <Box marginTop={2}>
          <Text bold>Press Enter to save configuration</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Enter to continue • ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Initial Sync
  if (step === 'initial-sync') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">Step 4: Initial Sync</Text>
        </Box>

        <Text>Time to sync your existing files to the cloud!</Text>

        {!loading && !syncResult && (
          <Box flexDirection="column" marginTop={1}>
            <Text>This will:</Text>
            <Box marginLeft={2}>
              <Text>• Encrypt and upload all .md files in your directory</Text>
              <Text>• Set up sync tracking for future edits</Text>
              <Text>• Enable automatic sync-on-save</Text>
            </Box>

            <Box marginTop={2}>
              <Text bold>Ready to sync your files?</Text>
            </Box>

            <Box marginTop={1}>
              <Text dimColor>Enter to sync now • S to skip • ESC to cancel</Text>
            </Box>
          </Box>
        )}

        {loading && (
          <Box marginTop={1}>
            <Text color="yellow">⏳ Syncing files to cloud...</Text>
            <Text dimColor>This may take a moment depending on file count.</Text>
          </Box>
        )}

        {syncResult && !loading && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="green">✓ Initial sync complete!</Text>

            <Box marginTop={1}>
              <Text bold>Sync Results:</Text>
              <Text>• Total files processed: {syncResult.total}</Text>
              <Text>• Uploaded: {syncResult.uploaded || 0}</Text>
              <Text>• Updated: {syncResult.updated || 0}</Text>
              <Text>• Already synced: {syncResult.noChange || 0}</Text>
              {syncResult.errors > 0 && (
                <Text color="yellow">• Errors: {syncResult.errors}</Text>
              )}
            </Box>

            <Box marginTop={1}>
              <Text bold>Press Enter to continue</Text>
            </Box>
          </Box>
        )}

        {error && (
          <Box marginTop={1}>
            <Text color="red">✗ Sync failed: {error}</Text>
            <Text dimColor>You can retry sync later with "splitmark sync"</Text>
            <Box marginTop={1}>
              <Text bold>Press Enter to continue anyway</Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  // Setup Complete with Tips
  if (step === 'complete' || step === 'tips') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="green">🎉 Cloud Setup Complete!</Text>
        </Box>

        <Text>Your Splitmark Cloud is ready to use. Here are some tips:</Text>

        <Box marginTop={1} marginBottom={1} flexDirection="column">
          <Text bold color="cyan">💡 Pro Tips:</Text>

          <Box marginTop={1} marginLeft={2}>
            <Text>• <Text bold>Automatic Sync:</Text> Files sync when you save (Ctrl+S)</Text>
            <Text>• <Text bold>Check Status:</Text> Run "splitmark cloud:status" anytime</Text>
            <Text>• <Text bold>Manual Sync:</Text> Use "splitmark sync" for batch operations</Text>
            <Text>• <Text bold>View Files:</Text> All .md files in subdirectories are synced</Text>
            <Text>• <Text bold>Storage:</Text> Monitor usage with cloud status command</Text>
          </Box>
        </Box>

        <Box marginTop={1} marginBottom={1}>
          <Text bold color="cyan">🔍 What's Next:</Text>
          <Box marginLeft={2}>
            <Text>1. Start editing your files - they'll sync automatically</Text>
            <Text>2. Check "splitmark cloud:status" to see sync activity</Text>
            <Text>3. Set up other devices with the same account</Text>
          </Box>
        </Box>

        <Box marginTop={1} marginBottom={1}>
          <Text bold color="cyan">📚 Need Help:</Text>
          <Box marginLeft={2}>
            <Text>• Documentation: Run "splitmark help cloud"</Text>
            <Text>• Troubleshooting: See CLOUD.md file</Text>
            <Text>• Support: support@splitmark.app</Text>
          </Box>
        </Box>

        <Box marginTop={2}>
          <Text bold>Press Enter to finish setup</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Enter to complete • ESC to exit</Text>
        </Box>
      </Box>
    );
  }

  // Default fallback
  return (
    <Box padding={1}>
      <Text color="red">Unknown step: {step}</Text>
    </Box>
  );
};

export default CloudOnboarding;