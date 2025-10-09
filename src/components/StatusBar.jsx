import React, { memo } from 'react';
import { Box, Text } from 'ink';

const StatusBar = memo(function StatusBar({ saved, message, layout, showPreview, columnWidthRatio }) {
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
      {message && (
        <Box marginLeft={2}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}
      {!saved && !message && (
        <Box marginLeft={2}>
          <Text color="red">Modified</Text>
        </Box>
      )}
    </Box>
  );
});

export default StatusBar;
