import React, { memo } from 'react';
import { Box, Text } from 'ink';

const StatusBar = memo(function StatusBar({ saved, message, layout, showPreview, columnWidthRatio, cloudStatus }) {
  return (
    <Box borderStyle="single" borderColor="yellow" paddingX={1}>
      <Box flexGrow={1}>
        <Text>
          <Text bold color="cyan">^S</Text> Save
          <Text bold color="cyan"> ^O</Text> Config
          <Text bold color="cyan"> ^X</Text> Exit
          <Text bold color="cyan"> ^P</Text> Preview
          <Text bold color="cyan"> ^L</Text> Layout
          {layout === 'side' && showPreview && (
            <>
              <Text bold color="cyan"> ^W</Text> Width
            </>
          )}
          {showPreview !== undefined && (
            <Text dimColor> {showPreview ? '👁' : '🙈'}</Text>
          )}
          {layout && (
            <Text dimColor> [{layout === 'side' ? 'Side' : 'Bottom'}]</Text>
          )}
          {layout === 'side' && showPreview && columnWidthRatio !== undefined && (
            <Text dimColor> [{columnWidthRatio}/{100 - columnWidthRatio}]</Text>
          )}
        </Text>
      </Box>
      {cloudStatus && (
        <Box marginLeft={2}>
          {cloudStatus === 'synced' && <Text color="green">Cloud: ✓ Synced</Text>}
          {cloudStatus === 'uploading' && <Text color="yellow">Cloud: ↑ Uploading...</Text>}
          {cloudStatus === 'downloading' && <Text color="yellow">Cloud: ↓ Downloading...</Text>}
          {cloudStatus === 'conflict' && <Text color="red">Cloud: ⚠ Conflict</Text>}
          {cloudStatus === 'error' && <Text color="red">Cloud: ✗ Error</Text>}
          {cloudStatus === 'pending' && <Text color="yellow">Cloud: ⋯ Pending</Text>}
          {cloudStatus === 'not_logged_in' && <Text dimColor>Cloud: Not logged in</Text>}
        </Box>
      )}
      {message && (
        <Box marginLeft={2}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}
      {!saved && !message && !cloudStatus && (
        <Box marginLeft={2}>
          <Text color="red">Modified</Text>
        </Box>
      )}
    </Box>
  );
});

export default StatusBar;
