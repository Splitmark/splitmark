import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { getConfigPath } from './utils/config.js';
import Editor from './components/Editor.jsx';
import Preview from './components/Preview.jsx';
import StatusBar from './components/StatusBar.jsx';
import { syncFileOnSave } from './cloud/sync/syncOnSave.js';
import { formatMarkdown } from './utils/formatMarkdown.js';

export default function App({ filePath: initialFilePath, initialContent, layout: initialLayout, showPreview: initialShowPreview, config, onExit }) {
  const [filePath, setFilePath] = useState(initialFilePath);
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(true);
  const [message, setMessage] = useState('');
  const [layout, setLayout] = useState(initialLayout);
  const [showPreview, setShowPreview] = useState(initialShowPreview);
  const [terminalSize, setTerminalSize] = useState({
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24
  });
  const [cursorPosition, setCursorPosition] = useState({ line: 0, col: 0 });
  const [columnWidthRatio, setColumnWidthRatio] = useState(config?.columnWidthRatio || 75); // Editor width percentage from config
  const [exitWarningShown, setExitWarningShown] = useState(false);
  const [returnToFile, setReturnToFile] = useState(null); // Track file to return to after editing config
  const { exit: inkExit } = useApp();
  const { stdout } = useStdout();

  // Use custom onExit callback if provided, otherwise use Ink's exit
  const exit = onExit || inkExit;

  // Track active timeouts for cleanup
  const timeoutsRef = React.useRef([]);
  const exitingRef = React.useRef(false);

  // Helper to add timeout with cleanup tracking
  const addTimeout = useCallback((callback, delay) => {
    const id = setTimeout(() => {
      if (!exitingRef.current) {
        callback();
      }
      // Remove from tracking array
      timeoutsRef.current = timeoutsRef.current.filter(t => t !== id);
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      exitingRef.current = true;
      timeoutsRef.current.forEach(id => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    setSaved(content === initialContent);
  }, [content, initialContent]);

  // Track terminal size and handle resize
  useEffect(() => {
    const updateSize = () => {
      if (stdout && stdout.columns && stdout.rows) {
        setTerminalSize({
          width: stdout.columns,
          height: stdout.rows,
        });
      } else {
        // Fallback to process.stdout if ink stdout isn't available
        setTerminalSize({
          width: process.stdout.columns || 80,
          height: process.stdout.rows || 24,
        });
      }
    };

    // Set initial size with a small delay to ensure proper detection
    setTimeout(updateSize, 100);

    // Listen for resize events
    if (stdout) {
      stdout.on('resize', updateSize);
      return () => {
        stdout.off('resize', updateSize);
      };
    }
  }, [stdout]);

  const handleSave = useCallback(async () => {
    try {
      writeFileSync(filePath, content, 'utf-8');
      setSaved(true);
      setExitWarningShown(false); // Clear exit warning on save
      setMessage('Saved!');

      // Attempt cloud sync if available
      try {
        const syncResult = await syncFileOnSave(filePath);
        if (syncResult) {
          // Update message to include sync status
          if (syncResult.action === 'uploaded' || syncResult.action === 'updated') {
            setMessage('Saved & synced to cloud!');
          } else if (syncResult.action === 'conflict') {
            setMessage('Saved! Cloud sync conflict detected.');
          } else if (syncResult.action === 'error') {
            setMessage('Saved! Cloud sync failed.');
          }
        }
      } catch (syncError) {
        // Don't let sync errors prevent local save success message
        console.warn('Sync-on-save failed:', syncError.message);
      }

      addTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  }, [filePath, content, addTimeout]);

  const handleFormat = useCallback(() => {
    try {
      const formatted = formatMarkdown(content);

      if (formatted === content) {
        setMessage('Already formatted');
        addTimeout(() => setMessage(''), 1500);
        return;
      }

      setContent(formatted);
      setMessage('Formatted markdown');
      addTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`Format error: ${error.message}`);
      addTimeout(() => setMessage(''), 3000);
    }
  }, [content, addTimeout]);

  useInput((input, key) => {
    // Clear exit warning on any key press except Ctrl+X
    if (!(key.ctrl && input === 'x') && exitWarningShown) {
      setExitWarningShown(false);
    }

    // Ctrl+S: Save
    if (key.ctrl && input === 's') {
      handleSave();
    }
    // Ctrl+Shift+F: Format markdown
    if (key.ctrl && key.shift && input && input.toLowerCase() === 'f') {
      handleFormat();
    }
    // Ctrl+O: Open config file (or return to original file if editing config)
    if (key.ctrl && input === 'o') {
      const configPath = getConfigPath();

      // If we're currently editing the config file, return to the original file
      if (returnToFile) {
        // Save config first if there are changes
        if (!saved) {
          handleSave();
        }

        // Load the original file content
        try {
          const originalContent = existsSync(returnToFile) ? readFileSync(returnToFile, 'utf-8') : '';

          setFilePath(returnToFile);
          setContent(originalContent);
          setSaved(true);
          setReturnToFile(null);
          setMessage('Returned to original file');
          addTimeout(() => setMessage(''), 2000);
        } catch (error) {
          setMessage(`Error loading file: ${error.message}`);
        }
      } else {
        // Opening config file - save current file first if needed
        if (!saved) {
          handleSave();
        }

        // Load config file
        try {
          const configContent = readFileSync(configPath, 'utf-8');

          setReturnToFile(filePath); // Remember current file
          setFilePath(configPath);
          setContent(configContent);
          setSaved(true);
          setMessage('Editing config - Press Ctrl+O again to return');
          addTimeout(() => setMessage(''), 3000);
        } catch (error) {
          setMessage(`Error loading config: ${error.message}`);
        }
      }
    }
    // Ctrl+X: Exit
    if (key.ctrl && input === 'x') {
      if (!saved && !exitWarningShown) {
        // First Ctrl+X with unsaved changes - show warning
        setExitWarningShown(true);
        setMessage('Unsaved changes! Press Ctrl+S to save or Ctrl+X again to exit.');
        addTimeout(() => {
          setMessage('');
        }, 3000);
      } else {
        // Either saved OR second Ctrl+X press - exit immediately
        // Mark as exiting and clear all pending timeouts
        exitingRef.current = true;
        timeoutsRef.current.forEach(id => clearTimeout(id));
        timeoutsRef.current = [];
        exit();
      }
    }
    // Ctrl+P: Toggle preview visibility
    if (key.ctrl && input === 'p') {
      setShowPreview(!showPreview);
      setMessage(`Preview: ${!showPreview ? 'Shown' : 'Hidden'}`);
      addTimeout(() => setMessage(''), 2000);
    }
    // Ctrl+L: Toggle preview layout
    if (key.ctrl && input === 'l') {
      const newLayout = layout === 'side' ? 'bottom' : 'side';
      setLayout(newLayout);
      setMessage(`Layout: ${newLayout === 'side' ? 'Side-by-side' : 'Top-bottom'}`);
      addTimeout(() => setMessage(''), 2000);
    }
    // Ctrl+W: Cycle column width ratio (only applies to side-by-side layout)
    if (key.ctrl && input === 'w') {
      if (layout === 'side' && showPreview) {
        const ratios = [75, 50, 25];
        const currentIndex = ratios.indexOf(columnWidthRatio);
        const nextIndex = (currentIndex + 1) % ratios.length;
        const newRatio = ratios[nextIndex];
        setColumnWidthRatio(newRatio);
        setMessage(`Column width: ${newRatio}/${100 - newRatio}`);
        addTimeout(() => setMessage(''), 2000);
      }
    }
  });

  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
  }, []);

  const handleCursorMove = useCallback((position) => {
    setCursorPosition(position);
  }, []);

  const isHorizontal = layout === 'side';

  // Calculate viewport height for editor and preview
  // Terminal height - title bar (1) - status bar (3) - borders (2) - padding
  const editorTitleHeight = 1;
  const previewTitleHeight = 1;
  const statusBarHeight = 3;
  const bordersHeight = 2;
  const totalUIOverhead = editorTitleHeight + statusBarHeight + bordersHeight;

  let editorViewportHeight = terminalSize.height - totalUIOverhead;
  let previewViewportHeight = terminalSize.height - totalUIOverhead - previewTitleHeight;

  if (!isHorizontal && showPreview) {
    // In bottom layout, split the available height
    editorViewportHeight = Math.floor((terminalSize.height - totalUIOverhead) * 0.7);
    previewViewportHeight = Math.floor((terminalSize.height - totalUIOverhead) * 0.3) - previewTitleHeight;
  }

  // Ensure minimum height
  editorViewportHeight = Math.max(5, editorViewportHeight);
  previewViewportHeight = Math.max(5, previewViewportHeight);

  // Calculate editor and preview widths based on ratio (for side layout)
  const editorWidth = isHorizontal && showPreview ? `${columnWidthRatio}%` : '100%';
  const previewWidth = isHorizontal ? `${100 - columnWidthRatio}%` : '100%';

  // Calculate actual preview width in columns for wrapping
  let previewWidthCols = terminalSize.width;
  if (isHorizontal && showPreview) {
    previewWidthCols = Math.floor((terminalSize.width * (100 - columnWidthRatio)) / 100);
  }

  // Calculate actual editor width in columns
  let editorWidthCols = terminalSize.width;
  if (isHorizontal && showPreview) {
    editorWidthCols = Math.floor((terminalSize.width * columnWidthRatio) / 100);
  }

  return (
    <Box flexDirection="column" height={terminalSize.height}>
      <Box flexGrow={1} flexDirection={isHorizontal ? 'row' : 'column'}>
        <Box
          flexDirection="column"
          width={editorWidth}
          height={!isHorizontal && showPreview ? '70%' : '100%'}
          borderStyle="single"
          borderColor="cyan"
        >
          <Text bold color="cyan">
            {' '}Editor: {filePath} {saved ? '' : '(modified)'}
          </Text>
          <Editor
            key={filePath}
            content={content}
            onChange={handleContentChange}
            viewportHeight={editorViewportHeight}
            onCursorMove={handleCursorMove}
            editorWidth={editorWidthCols}
          />
        </Box>

        {showPreview && (
          <Box
            flexDirection="column"
            width={previewWidth}
            height={!isHorizontal ? '30%' : '100%'}
            borderStyle="single"
            borderColor="green"
          >
            <Text bold color="green">
              {' '}Preview
            </Text>
            <Preview
              content={content}
              cursorLine={cursorPosition.line}
              viewportHeight={previewViewportHeight}
              previewWidth={previewWidthCols}
            />
          </Box>
        )}
      </Box>

      <StatusBar
        saved={saved}
        message={message}
        layout={layout}
        showPreview={showPreview}
        columnWidthRatio={columnWidthRatio}
      />
    </Box>
  );
}
