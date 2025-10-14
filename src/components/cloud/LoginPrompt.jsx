/**
 * Interactive login prompt component
 * Uses device flow for better CLI authentication UX
 * Falls back to manual email/password entry if needed
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { login, signup, loginWithDeviceFlow } from '../../cloud/api/auth.js';
import { getApiUrl } from '../../utils/cloudConfig.js';

const LoginPrompt = ({ config, onSuccess, onCancel }) => {
  const [mode, setMode] = useState('menu'); // menu, device-flow, login, signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [currentField, setCurrentField] = useState('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Device flow state
  const [deviceFlowState, setDeviceFlowState] = useState(null); // { userCode, verificationUrl, ... }
  const [waitingTime, setWaitingTime] = useState(0);

  const apiUrl = getApiUrl(config);

  useInput((input, key) => {
    if (loading && mode !== 'device-flow') return;

    // ESC or Ctrl+C to cancel
    if (input === 'q' || key.escape) {
      if (mode === 'menu') {
        onCancel && onCancel();
      } else if (mode === 'device-flow') {
        // Can cancel device flow
        setMode('menu');
        setDeviceFlowState(null);
        setWaitingTime(0);
        setError(null);
      } else {
        setMode('menu');
        setError(null);
        resetFields();
      }
      return;
    }

    // Menu navigation
    if (mode === 'menu') {
      if (input === '1') {
        startDeviceFlow();
      } else if (input === '2') {
        setMode('login');
        setCurrentField('email');
      } else if (input === '3') {
        setMode('signup');
        setCurrentField('email');
      }
    }
  });

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setCurrentField('email');
  };

  const startDeviceFlow = async () => {
    setMode('device-flow');
    setLoading(true);
    setError(null);

    try {
      await loginWithDeviceFlow(apiUrl, (progress) => {
        if (progress.status === 'initiated') {
          setDeviceFlowState({
            userCode: progress.userCode,
            verificationUrl: progress.verificationUrl,
            verificationUrlComplete: progress.verificationUrlComplete,
          });
          setLoading(false); // Stop showing loading, now waiting for user
        } else if (progress.status === 'waiting') {
          setWaitingTime(progress.elapsed);
        } else if (progress.status === 'success') {
          const displayName = progress.user.displayName || progress.user.email || 'User';
          setSuccess(`Welcome, ${displayName}!`);
          setTimeout(() => {
            onSuccess && onSuccess({ user: progress.user });
          }, 1500);
        } else if (progress.status === 'error') {
          setError(progress.error);
          setLoading(false);
        }
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setDeviceFlowState(null);
    }
  };

  const handleManualSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      let result;
      if (mode === 'login') {
        if (!email || !password) {
          setError('Email and password are required');
          setLoading(false);
          return;
        }
        result = await login(apiUrl, email, password);
        const displayName = result.user.displayName || result.user.email || 'User';
        setSuccess(`Welcome back, ${displayName}!`);
      } else if (mode === 'signup') {
        if (!email || !password || !username) {
          setError('All fields are required');
          setLoading(false);
          return;
        }
        result = await signup(apiUrl, email, password, username);
        const displayName = result.user.displayName || result.user.email || 'User';
        setSuccess(`Account created! Welcome, ${displayName}!`);
      }

      // Wait a moment to show success message
      setTimeout(() => {
        onSuccess && onSuccess(result);
      }, 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFieldSubmit = () => {
    if (mode === 'login') {
      if (currentField === 'email') {
        setCurrentField('password');
      } else {
        handleManualSubmit();
      }
    } else if (mode === 'signup') {
      if (currentField === 'email') {
        setCurrentField('username');
      } else if (currentField === 'username') {
        setCurrentField('password');
      } else {
        handleManualSubmit();
      }
    }
  };

  // Render menu
  if (mode === 'menu') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Splitmark Cloud Authentication
          </Text>
        </Box>
        <Text dimColor>Connect your account to sync files across devices</Text>

        <Box marginTop={1} marginBottom={1}>
          <Text bold>1. Browser Login (Recommended)</Text>
          <Text dimColor>   Authenticate securely in your browser</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>2. Manual Login</Text>
          <Text dimColor>   Log in with email and password</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>3. Create New Account</Text>
          <Text dimColor>   Sign up with email, username, and password</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Press 1, 2, or 3 to continue • Q to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Render device flow
  if (mode === 'device-flow') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Browser Authentication
          </Text>
        </Box>

        {error && (
          <Box marginBottom={1}>
            <Text color="red">✗ {error}</Text>
          </Box>
        )}

        {success && (
          <Box marginBottom={1}>
            <Text color="green">✓ {success}</Text>
          </Box>
        )}

        {loading && !deviceFlowState && (
          <Box marginTop={1}>
            <Text color="yellow">⏳ Initializing authentication...</Text>
          </Box>
        )}

        {deviceFlowState && !success && (
          <>
            <Box marginTop={1} marginBottom={1} flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
              <Text bold>Step 1: Open your browser</Text>
              <Text>Visit: <Text color="cyan" bold>{deviceFlowState.verificationUrl}</Text></Text>

              <Box marginTop={1}>
                <Text bold>Step 2: Enter this code:</Text>
              </Box>
              <Box justifyContent="center" marginTop={1} marginBottom={1}>
                <Text color="green" bold fontSize={20}>{deviceFlowState.userCode}</Text>
              </Box>

              <Text dimColor>The code will expire in 10 minutes</Text>
            </Box>

            <Box marginTop={1}>
              <Text color="yellow">⏳ Waiting for authorization... ({waitingTime}s)</Text>
            </Box>

            <Box marginTop={1}>
              <Text dimColor>Press Q or ESC to cancel</Text>
            </Box>
          </>
        )}
      </Box>
    );
  }

  // Render manual login/signup form
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {mode === 'login' ? 'Manual Login' : 'Create Account'}
        </Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">✗ {error}</Text>
        </Box>
      )}

      {success && (
        <Box marginBottom={1}>
          <Text color="green">✓ {success}</Text>
        </Box>
      )}

      {!success && !loading && (
        <>
          <Box marginBottom={1}>
            <Box width={12}>
              <Text color={currentField === 'email' ? 'cyan' : 'gray'}>
                Email:
              </Text>
            </Box>
            {currentField === 'email' ? (
              <TextInput
                value={email}
                onChange={setEmail}
                onSubmit={handleFieldSubmit}
                placeholder="user@example.com"
              />
            ) : (
              <Text>{email || <Text dimColor>(empty)</Text>}</Text>
            )}
          </Box>

          {mode === 'signup' && (
            <Box marginBottom={1}>
              <Box width={12}>
                <Text color={currentField === 'username' ? 'cyan' : 'gray'}>
                  Username:
                </Text>
              </Box>
              {currentField === 'username' ? (
                <TextInput
                  value={username}
                  onChange={setUsername}
                  onSubmit={handleFieldSubmit}
                  placeholder="myusername"
                />
              ) : (
                <Text>{username || <Text dimColor>(empty)</Text>}</Text>
              )}
            </Box>
          )}

          <Box marginBottom={1}>
            <Box width={12}>
              <Text color={currentField === 'password' ? 'cyan' : 'gray'}>
                Password:
              </Text>
            </Box>
            {currentField === 'password' ? (
              <TextInput
                value={password}
                onChange={setPassword}
                onSubmit={handleFieldSubmit}
                placeholder="••••••••"
                mask="•"
              />
            ) : (
              <Text>{password ? '••••••••' : <Text dimColor>(empty)</Text>}</Text>
            )}
          </Box>

          <Box marginTop={1}>
            <Text dimColor>Press Enter to continue • ESC to go back</Text>
          </Box>
        </>
      )}

      {loading && (
        <Box marginTop={1}>
          <Text color="yellow">⏳ Authenticating...</Text>
        </Box>
      )}
    </Box>
  );
};

export default LoginPrompt;
