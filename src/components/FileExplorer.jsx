import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdin } from 'ink';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';

export default function FileExplorer({ initialPath, onSelectFile, onExit }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState(false); // true when asking for filename
  const [filenameInput, setFilenameInput] = useState('');

  // Ensure stdin is available
  const { stdin, setRawMode } = useStdin();

  // Set raw mode on mount - don't disable on unmount as Ink manages this
  useEffect(() => {
    if (setRawMode) {
      setRawMode(true);
    }
  }, [setRawMode]);

  // Load directory contents
  useEffect(() => {
    try {
      if (!existsSync(currentPath)) {
        setError(`Directory does not exist: ${currentPath}`);
        return;
      }

      const entries = readdirSync(currentPath);
      const itemList = entries.map(name => {
        const fullPath = join(currentPath, name);
        try {
          const stats = statSync(fullPath);
          return {
            name,
            path: fullPath,
            isDirectory: stats.isDirectory(),
            isMarkdown: name.endsWith('.md'),
            size: stats.size,
            modified: stats.mtime,
          };
        } catch (err) {
          return null;
        }
      }).filter(Boolean);

      // Sort: directories first, then markdown files, then others
      itemList.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        if (!a.isDirectory && !b.isDirectory) {
          if (a.isMarkdown && !b.isMarkdown) return -1;
          if (!a.isMarkdown && b.isMarkdown) return 1;
        }
        return a.name.localeCompare(b.name);
      });

      // Add parent directory option
      if (dirname(currentPath) !== currentPath) {
        itemList.unshift({
          name: '..',
          path: dirname(currentPath),
          isDirectory: true,
          isParent: true,
        });
      }

      setItems(itemList);
      setSelectedIndex(0);
      setError('');
    } catch (err) {
      setError(`Error reading directory: ${err.message}`);
    }
  }, [currentPath]);

  // Handle keyboard input - make sure it's always active
  useInput((input, key) => {
    if (error) {
      if (key.escape || input === 'q') {
        onExit();
      }
      return;
    }

    // If in input mode (entering filename)
    if (inputMode) {
      if (key.escape) {
        // Cancel filename input
        setInputMode(false);
        setFilenameInput('');
        return;
      }

      if (key.return) {
        // Create file with entered name
        let fileName = filenameInput.trim();
        if (fileName) {
          // Add .md extension if not present
          if (!fileName.endsWith('.md')) {
            fileName += '.md';
          }
          const newFilePath = join(currentPath, fileName);
          setInputMode(false);
          setFilenameInput('');
          onSelectFile(newFilePath);
        }
        return;
      }

      if (key.backspace || key.delete) {
        // Remove last character
        setFilenameInput(filenameInput.slice(0, -1));
        return;
      }

      // Add character to filename
      if (input && !key.ctrl && !key.meta) {
        setFilenameInput(filenameInput + input);
      }
      return;
    }

    // Q or Escape: Exit (check first to avoid being caught by other handlers)
    if (key.escape || input === 'q') {
      onExit();
      return;
    }

    // N: New file
    if (input === 'n') {
      // Enter input mode to ask for filename
      setInputMode(true);
      setFilenameInput('');
      return;
    }

    // Enter: open file or directory
    if (key.return) {
      const selected = items[selectedIndex];
      if (selected) {
        if (selected.isDirectory) {
          setCurrentPath(selected.path);
        } else if (selected.isMarkdown) {
          onSelectFile(selected.path);
        }
      }
      return;
    }

    // Navigate up/down
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(items.length - 1, selectedIndex + 1));
    }
    // Page up/down
    else if (key.pageUp) {
      setSelectedIndex(Math.max(0, selectedIndex - 10));
    } else if (key.pageDown) {
      setSelectedIndex(Math.min(items.length - 1, selectedIndex + 10));
    }
    // Home/End
    else if (key.home) {
      setSelectedIndex(0);
    } else if (key.end) {
      setSelectedIndex(items.length - 1);
    }
  }, { isActive: true });

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Error</Text>
        <Text color="red">{error}</Text>
        <Text dimColor marginTop={1}>Press Q or Escape to exit</Text>
      </Box>
    );
  }

  const viewportHeight = 20;
  const startIndex = Math.max(0, Math.min(selectedIndex - Math.floor(viewportHeight / 2), items.length - viewportHeight));
  const visibleItems = items.slice(startIndex, startIndex + viewportHeight);

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">Splitmark File Explorer</Text>
      </Box>

      {/* Current path */}
      <Box paddingX={1} paddingY={0}>
        <Text dimColor>Location: </Text>
        <Text color="cyan">{currentPath}</Text>
      </Box>

      {/* File list */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingTop={1}>
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          const isSelected = actualIndex === selectedIndex;

          let icon = '  ';
          let color = 'white';

          if (item.isParent) {
            icon = '📁';
            color = 'yellow';
          } else if (item.isDirectory) {
            icon = '📁';
            color = 'yellow';
          } else if (item.isMarkdown) {
            icon = '📝';
            color = 'green';
          } else {
            icon = '📄';
            color = 'gray';
          }

          return (
            <Box key={item.path}>
              <Text
                color={isSelected ? 'black' : color}
                backgroundColor={isSelected ? 'cyan' : undefined}
                bold={isSelected}
              >
                {icon} {item.name}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Footer / Help or Input Prompt */}
      <Box borderStyle="single" borderColor={inputMode ? 'green' : 'yellow'} paddingX={1}>
        {inputMode ? (
          <Box>
            <Text color="green" bold>New file name: </Text>
            <Text color="white">{filenameInput}</Text>
            <Text color="cyan" bold>█</Text>
            <Text dimColor> (Enter to create, Escape to cancel, .md added automatically)</Text>
          </Box>
        ) : (
          <Text>
            <Text bold color="cyan">↑↓</Text> Navigate
            <Text bold color="cyan"> Enter</Text> Open
            <Text bold color="cyan"> N</Text> New File
            <Text bold color="cyan"> Q</Text> Quit
            <Text dimColor> │ {items.length} items</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}
