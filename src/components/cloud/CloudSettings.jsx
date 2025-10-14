/**
 * Cloud settings panel component
 * Allows users to configure cloud sync settings
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getCloudConfig, updateCloudConfig } from '../../utils/cloudConfig.js';
import { hasStoredCredentials, getCredentials } from '../../cloud/storage/credentials.js';

const CloudSettings = ({ config, onSave, onCancel }) => {
  const [cloudConfig, setCloudConfig] = useState(getCloudConfig(config));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [selectedOption, setSelectedOption] = useState(0);

  useEffect(() => {
    (async () => {
      const loggedIn = await hasStoredCredentials();
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        const creds = await getCredentials();
        setUserInfo(creds.user);
      }
    })();
  }, []);

  const options = [
    { key: 'enabled', label: 'Enable Cloud Sync', type: 'boolean' },
    { key: 'autoSync', label: 'Auto-sync on save', type: 'boolean' },
    { key: 'save', label: 'Save Settings', type: 'action' },
    { key: 'cancel', label: 'Cancel', type: 'action' },
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedOption(Math.max(0, selectedOption - 1));
    } else if (key.downArrow) {
      setSelectedOption(Math.min(options.length - 1, selectedOption + 1));
    } else if (key.return || input === ' ') {
      const option = options[selectedOption];
      if (option.type === 'boolean') {
        setCloudConfig({
          ...cloudConfig,
          [option.key]: !cloudConfig[option.key],
        });
      } else if (option.key === 'save') {
        const updatedConfig = updateCloudConfig(config, cloudConfig);
        onSave && onSave(updatedConfig);
      } else if (option.key === 'cancel') {
        onCancel && onCancel();
      }
    } else if (key.escape || input === 'q') {
      onCancel && onCancel();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Cloud Sync Settings
        </Text>
      </Box>

      {isLoggedIn && userInfo && (
        <Box marginBottom={1} flexDirection="column">
          <Text color="green">✓ Logged in as: {userInfo.username}</Text>
          <Text dimColor>  Email: {userInfo.email}</Text>
          {userInfo.isPremium && <Text color="yellow">  Premium Account</Text>}
        </Box>
      )}

      {!isLoggedIn && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ Not logged in. Run "splitmark login" to authenticate.</Text>
        </Box>
      )}

      <Box marginTop={1} marginBottom={1} flexDirection="column">
        {options.map((option, index) => (
          <Box key={option.key} marginBottom={index < options.length - 1 ? 1 : 0}>
            {option.type === 'boolean' && (
              <Text>
                <Text color={selectedOption === index ? 'cyan' : 'white'}>
                  {selectedOption === index ? '▶ ' : '  '}
                </Text>
                <Text>
                  [{cloudConfig[option.key] ? '✓' : ' '}] {option.label}
                </Text>
              </Text>
            )}
            {option.type === 'action' && (
              <Text color={selectedOption === index ? 'cyan' : 'white'}>
                {selectedOption === index ? '▶ ' : '  '}
                {option.label}
              </Text>
            )}
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>↑↓ Navigate | Space/Enter Select | Q/ESC Cancel</Text>
      </Box>

      {!isLoggedIn && (
        <Box marginTop={1}>
          <Text dimColor>Note: Cloud sync requires authentication</Text>
        </Box>
      )}
    </Box>
  );
};

export default CloudSettings;
