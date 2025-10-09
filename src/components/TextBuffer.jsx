import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, measureElement } from 'ink';
import { highlightMarkdownLine } from '../utils/syntaxHighlight.js';

let lineIdCounter = 0;

/**
 * Wrap a line of text to fit within maxWidth, breaking at word boundaries
 */
function wrapTextLine(text, maxWidth) {
  if (!text || text.length <= maxWidth) return [text];

  const wrappedLines = [];
  let currentLine = '';

  const words = text.split(' ');

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const separator = i < words.length - 1 ? ' ' : '';

    // If adding this word would exceed max width
    if (currentLine.length + word.length + separator.length > maxWidth) {
      // If current line is empty, the word itself is too long - split it
      if (currentLine.length === 0) {
        wrappedLines.push(word.substring(0, maxWidth));
        let remaining = word.substring(maxWidth);
        while (remaining.length > maxWidth) {
          wrappedLines.push(remaining.substring(0, maxWidth));
          remaining = remaining.substring(maxWidth);
        }
        if (remaining.length > 0) {
          currentLine = remaining + separator;
        }
      } else {
        // Start a new line with this word
        wrappedLines.push(currentLine.trimEnd());
        currentLine = word + separator;
      }
    } else {
      currentLine += word + separator;
    }
  }

  if (currentLine.length > 0) {
    wrappedLines.push(currentLine.trimEnd());
  }

  return wrappedLines.length > 0 ? wrappedLines : [text];
}

/**
 * Render a line with cursor, selection, and syntax highlighting
 * Optimized to batch characters with same styling
 */
function renderLineWithCursorAndSelection(lineText, cursorCol, segments, lineIndex, selection, cursorLine) {
  const elements = [];

  // Determine if this line has selection
  let selStart = -1;
  let selEnd = -1;
  if (selection) {
    // Normalize selection to always have start before end
    const isForward = selection.startLine < selection.endLine ||
      (selection.startLine === selection.endLine && selection.startCol <= selection.endCol);

    const start = isForward ?
      { line: selection.startLine, col: selection.startCol } :
      { line: selection.endLine, col: selection.endCol };
    const end = isForward ?
      { line: selection.endLine, col: selection.endCol } :
      { line: selection.startLine, col: selection.startCol };

    if (lineIndex >= start.line && lineIndex <= end.line) {
      selStart = lineIndex === start.line ? start.col : 0;
      selEnd = lineIndex === end.line ? end.col : lineText.length;
    }
  }

  const isCurrentLine = lineIndex === cursorLine;
  let currentPos = 0;

  // If not current line and no selection, just render segments as-is (fast path)
  if (!isCurrentLine && selStart === -1) {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      elements.push(
        <Text key={i} color={segment.color} bold={segment.bold} italic={segment.italic}>
          {segment.text}
        </Text>
      );
    }
    return elements;
  }

  // Need to handle cursor and/or selection (slower path)
  let keyCounter = 0;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentStart = currentPos;
    const segmentEnd = currentPos + segment.text.length;

    let batchText = '';
    let batchStyle = null;

    for (let pos = 0; pos < segment.text.length; pos++) {
      const globalPos = segmentStart + pos;
      const char = segment.text[pos];

      const isSelected = selStart !== -1 && globalPos >= selStart && globalPos < selEnd;
      const isCursor = isCurrentLine && globalPos === cursorCol;

      let charStyle = { type: 'normal', color: segment.color, bold: segment.bold, italic: segment.italic };
      if (isCursor) charStyle = { type: 'cursor' };
      else if (isSelected) charStyle = { type: 'selected' };

      // Check if style changed
      if (batchStyle && (charStyle.type !== batchStyle.type || charStyle.color !== batchStyle.color)) {
        // Flush batch
        if (batchStyle.type === 'cursor') {
          elements.push(<Text key={keyCounter++} inverse>{batchText || ' '}</Text>);
        } else if (batchStyle.type === 'selected') {
          elements.push(<Text key={keyCounter++} backgroundColor="blue" color="white">{batchText}</Text>);
        } else {
          elements.push(<Text key={keyCounter++} color={batchStyle.color} bold={batchStyle.bold} italic={batchStyle.italic}>{batchText}</Text>);
        }
        batchText = '';
      }

      batchStyle = charStyle;
      batchText += char;
    }

    // Flush remaining batch
    if (batchText) {
      if (batchStyle.type === 'cursor') {
        elements.push(<Text key={keyCounter++} inverse>{batchText || ' '}</Text>);
      } else if (batchStyle.type === 'selected') {
        elements.push(<Text key={keyCounter++} backgroundColor="blue" color="white">{batchText}</Text>);
      } else {
        elements.push(<Text key={keyCounter++} color={batchStyle.color} bold={batchStyle.bold} italic={batchStyle.italic}>{batchText}</Text>);
      }
    }

    currentPos = segmentEnd;
  }

  // Handle cursor at end of line
  if (isCurrentLine && cursorCol >= currentPos) {
    elements.push(<Text key={keyCounter++} inverse> </Text>);
  }

  return elements;
}

export default function TextBuffer({ content, onChange, isFocused = true, viewportHeight = 20, onCursorMove, editorWidth }) {
  const [lines, setLines] = useState(() =>
    content.split('\n').map((line) => ({ id: `line-${lineIdCounter++}`, text: line }))
  );
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selection, setSelection] = useState(null); // { startLine, startCol, endLine, endCol }

  // Undo/Redo state - initialize with current state
  const [history, setHistory] = useState(() => [{
    lines: content.split('\n').map((line) => ({ id: `line-${lineIdCounter++}`, text: line })),
    cursorLine: 0,
    cursorCol: 0,
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Helper: Save current state to history
  const saveToHistory = (newLines, newCursorLine, newCursorCol) => {
    const state = {
      lines: newLines.map(l => ({ ...l })),
      cursorLine: newCursorLine,
      cursorCol: newCursorCol,
    };

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);

    // Limit history to last 100 states
    if (newHistory.length > 100) {
      newHistory.shift();
      // Don't increment index when we shift - we stay at the same relative position
      setHistory(newHistory);
    } else {
      setHistoryIndex(historyIndex + 1);
      setHistory(newHistory);
    }
  };

  // Helper: Undo
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      const newLines = state.lines.map(l => ({ ...l }));

      setLines(newLines);
      setHistoryIndex(newIndex);
      setSelection(null);

      // Keep cursor position if valid, otherwise adjust to nearest valid position
      const newCursorLine = Math.min(cursorLine, newLines.length - 1);
      const newLineLength = newLines[newCursorLine]?.text?.length || 0;
      const newCursorCol = Math.min(cursorCol, newLineLength);

      setCursorLine(newCursorLine);
      setCursorCol(newCursorCol);
    }
  };

  // Helper: Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      const newLines = state.lines.map(l => ({ ...l }));

      setLines(newLines);
      setHistoryIndex(newIndex);
      setSelection(null);

      // Keep cursor position if valid, otherwise adjust to nearest valid position
      const newCursorLine = Math.min(cursorLine, newLines.length - 1);
      const newLineLength = newLines[newCursorLine]?.text?.length || 0;
      const newCursorCol = Math.min(cursorCol, newLineLength);

      setCursorLine(newCursorLine);
      setCursorCol(newCursorCol);
    }
  };

  // Helper: Find next word boundary position
  const findNextWordBoundary = (text, col) => {
    // Skip current word characters
    let pos = col;
    while (pos < text.length && /\w/.test(text[pos])) {
      pos++;
    }
    // Skip whitespace
    while (pos < text.length && /\s/.test(text[pos])) {
      pos++;
    }
    return pos;
  };

  // Helper: Find previous word boundary position
  const findPrevWordBoundary = (text, col) => {
    if (col === 0) return 0;
    let pos = col - 1;
    // Skip whitespace
    while (pos > 0 && /\s/.test(text[pos])) {
      pos--;
    }
    // Skip word characters to find word start
    while (pos > 0 && /\w/.test(text[pos - 1])) {
      pos--;
    }
    return pos;
  };

  // Update parent when lines change
  useEffect(() => {
    onChange(lines.map(l => l.text).join('\n'));
  }, [lines, onChange]);

  // Reset when content prop changes (initial load only)
  useEffect(() => {
    if (lines.length === 0 || (lines.length === 1 && lines[0].text === '')) {
      const newLines = content.split('\n').map((line) => ({
        id: `line-${lineIdCounter++}`,
        text: line
      }));
      setLines(newLines);
    }
  }, []);

  // Keep cursor visible by adjusting scroll offset
  useEffect(() => {
    // Scroll down if cursor is below viewport
    if (cursorLine >= scrollOffset + viewportHeight) {
      setScrollOffset(cursorLine - viewportHeight + 1);
    }
    // Scroll up if cursor is above viewport
    else if (cursorLine < scrollOffset) {
      setScrollOffset(cursorLine);
    }
  }, [cursorLine, scrollOffset, viewportHeight]);

  // Notify parent of cursor position changes
  useEffect(() => {
    if (onCursorMove) {
      onCursorMove({ line: cursorLine, col: cursorCol });
    }
  }, [cursorLine, cursorCol, onCursorMove]);

  useInput((input, key) => {
    if (!isFocused) return;

    // Ctrl+Z: Undo
    if (key.ctrl && input === 'z' && !key.shift) {
      undo();
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z: Redo
    if ((key.ctrl && input === 'y') || (key.ctrl && key.shift && input === 'z')) {
      redo();
      return;
    }

    const currentLineText = lines[cursorLine]?.text || '';

    // Arrow keys with Ctrl for word navigation and Ctrl+Shift for selection
    if (key.leftArrow) {
      if (key.ctrl) {
        // Ctrl+Left: Jump to previous word
        const newCol = findPrevWordBoundary(currentLineText, cursorCol);
        if (key.shift) {
          // Ctrl+Shift+Left: Select to previous word
          if (!selection) {
            setSelection({ startLine: cursorLine, startCol: cursorCol, endLine: cursorLine, endCol: newCol });
          } else {
            setSelection({ ...selection, endLine: cursorLine, endCol: newCol });
          }
          setCursorCol(newCol);
        } else {
          setSelection(null);
          setCursorCol(newCol);
        }
      } else {
        // Regular left arrow
        const newCol = Math.max(0, cursorCol - 1);
        if (key.shift) {
          // Shift+Left: Select character
          if (!selection) {
            setSelection({ startLine: cursorLine, startCol: cursorCol, endLine: cursorLine, endCol: newCol });
          } else {
            setSelection({ ...selection, endLine: cursorLine, endCol: newCol });
          }
          setCursorCol(newCol);
        } else {
          setSelection(null);
          if (cursorCol > 0) {
            setCursorCol(cursorCol - 1);
          } else if (cursorLine > 0) {
            setCursorLine(cursorLine - 1);
            setCursorCol(lines[cursorLine - 1]?.text.length || 0);
          }
        }
      }
      return;
    }

    if (key.rightArrow) {
      if (key.ctrl) {
        // Ctrl+Right: Jump to next word
        const newCol = findNextWordBoundary(currentLineText, cursorCol);
        if (key.shift) {
          // Ctrl+Shift+Right: Select to next word
          if (!selection) {
            setSelection({ startLine: cursorLine, startCol: cursorCol, endLine: cursorLine, endCol: newCol });
          } else {
            setSelection({ ...selection, endLine: cursorLine, endCol: newCol });
          }
          setCursorCol(newCol);
        } else {
          setSelection(null);
          setCursorCol(newCol);
        }
      } else {
        // Regular right arrow
        const newCol = Math.min(currentLineText.length, cursorCol + 1);
        if (key.shift) {
          // Shift+Right: Select character
          if (!selection) {
            setSelection({ startLine: cursorLine, startCol: cursorCol, endLine: cursorLine, endCol: newCol });
          } else {
            setSelection({ ...selection, endLine: cursorLine, endCol: newCol });
          }
          setCursorCol(newCol);
        } else {
          setSelection(null);
          if (cursorCol < currentLineText.length) {
            setCursorCol(cursorCol + 1);
          } else if (cursorLine < lines.length - 1) {
            setCursorLine(cursorLine + 1);
            setCursorCol(0);
          }
        }
      }
      return;
    }

    if (key.upArrow) {
      if (!key.shift) {
        setSelection(null);
      }
      if (cursorLine > 0) {
        const newLine = cursorLine - 1;
        setCursorLine(newLine);
        const newLineLength = lines[newLine]?.text.length || 0;
        setCursorCol(Math.min(cursorCol, newLineLength));
      }
      return;
    }

    if (key.downArrow) {
      if (!key.shift) {
        setSelection(null);
      }
      if (cursorLine < lines.length - 1) {
        const newLine = cursorLine + 1;
        setCursorLine(newLine);
        const newLineLength = lines[newLine]?.text.length || 0;
        setCursorCol(Math.min(cursorCol, newLineLength));
      }
      return;
    }

    // Home/End keys
    if (key.home) {
      if (key.ctrl) {
        // Ctrl+Home: Go to beginning of file
        setCursorLine(0);
        setCursorCol(0);
      } else {
        // Home: Go to beginning of line
        setCursorCol(0);
      }
      return;
    }

    if (key.end) {
      if (key.ctrl) {
        // Ctrl+End: Go to end of file
        const lastLine = lines.length - 1;
        setCursorLine(lastLine);
        setCursorCol(lines[lastLine]?.text.length || 0);
      } else {
        // End: Go to end of line
        setCursorCol(currentLineText.length);
      }
      return;
    }

    // Page Up - jump up by viewport height
    if (key.pageUp) {
      const newLine = Math.max(0, cursorLine - viewportHeight);
      setCursorLine(newLine);
      const newLineLength = lines[newLine]?.text.length || 0;
      setCursorCol(Math.min(cursorCol, newLineLength));
      return;
    }

    // Page Down - jump down by viewport height
    if (key.pageDown) {
      const newLine = Math.min(lines.length - 1, cursorLine + viewportHeight);
      setCursorLine(newLine);
      const newLineLength = lines[newLine]?.text.length || 0;
      setCursorCol(Math.min(cursorCol, newLineLength));
      return;
    }

    // Tab key - insert spaces (2 spaces for Markdown)
    if (key.tab && !key.shift) {
      const tabSpaces = '  '; // 2 spaces
      const newText = currentLineText.substring(0, cursorCol) + tabSpaces + currentLineText.substring(cursorCol);
      const newLines = [...lines];
      newLines[cursorLine] = { ...newLines[cursorLine], text: newText };
      saveToHistory(lines, cursorLine, cursorCol);
      setLines(newLines);
      setCursorCol(cursorCol + tabSpaces.length);
      return;
    }

    // Shift+Tab - unindent (remove up to 2 spaces before cursor)
    if (key.tab && key.shift) {
      // Find how many spaces to remove (up to 2)
      let spacesToRemove = 0;
      for (let i = cursorCol - 1; i >= Math.max(0, cursorCol - 2); i--) {
        if (currentLineText[i] === ' ') {
          spacesToRemove++;
        } else {
          break;
        }
      }

      if (spacesToRemove > 0) {
        const newText = currentLineText.substring(0, cursorCol - spacesToRemove) + currentLineText.substring(cursorCol);
        const newLines = [...lines];
        newLines[cursorLine] = { ...newLines[cursorLine], text: newText };
        saveToHistory(lines, cursorLine, cursorCol);
        setLines(newLines);
        setCursorCol(cursorCol - spacesToRemove);
      }
      return;
    }

    // Enter key - create new line
    if (key.return) {
      const before = currentLineText.substring(0, cursorCol);
      const after = currentLineText.substring(cursorCol);

      const newLines = [
        ...lines.slice(0, cursorLine),
        { ...lines[cursorLine], text: before },
        { id: `line-${lineIdCounter++}`, text: after },
        ...lines.slice(cursorLine + 1),
      ];

      saveToHistory(lines, cursorLine, cursorCol);
      setLines(newLines);
      setCursorLine(cursorLine + 1);
      setCursorCol(0);
      return;
    }

    // Backspace/Delete
    if (key.backspace || key.delete) {
      saveToHistory(lines, cursorLine, cursorCol);

      // If there's a selection, delete it
      if (selection) {
        // Normalize selection to always have start before end
        const isForward = selection.startLine < selection.endLine ||
          (selection.startLine === selection.endLine && selection.startCol <= selection.endCol);

        const start = isForward ?
          { line: selection.startLine, col: selection.startCol } :
          { line: selection.endLine, col: selection.endCol };
        const end = isForward ?
          { line: selection.endLine, col: selection.endCol } :
          { line: selection.startLine, col: selection.startCol };

        if (start.line === end.line) {
          // Selection on same line
          const lineText = lines[start.line].text;
          const newText = lineText.substring(0, start.col) + lineText.substring(end.col);
          const newLines = [...lines];
          newLines[start.line] = { ...newLines[start.line], text: newText };
          setLines(newLines);
          setCursorLine(start.line);
          setCursorCol(start.col);
        } else {
          // Multi-line selection
          const firstLineText = lines[start.line].text.substring(0, start.col);
          const lastLineText = lines[end.line].text.substring(end.col);
          const newText = firstLineText + lastLineText;

          const newLines = [
            ...lines.slice(0, start.line),
            { ...lines[start.line], text: newText },
            ...lines.slice(end.line + 1),
          ];
          setLines(newLines);
          setCursorLine(start.line);
          setCursorCol(start.col);
        }
        setSelection(null);
      } else if (cursorCol > 0) {
        // Delete character before cursor
        const newText = currentLineText.substring(0, cursorCol - 1) + currentLineText.substring(cursorCol);
        const newLines = [...lines];
        newLines[cursorLine] = { ...newLines[cursorLine], text: newText };
        setLines(newLines);
        setCursorCol(cursorCol - 1);
      } else if (cursorLine > 0) {
        // Join with previous line
        const prevLine = lines[cursorLine - 1];
        const newText = prevLine.text + currentLineText;
        const newCursorCol = prevLine.text.length;

        const newLines = [
          ...lines.slice(0, cursorLine - 1),
          { ...prevLine, text: newText },
          ...lines.slice(cursorLine + 1),
        ];

        setLines(newLines);
        setCursorLine(cursorLine - 1);
        setCursorCol(newCursorCol);
      }
      return;
    }

    // Regular character input
    if (input && !key.ctrl && !key.meta) {
      saveToHistory(lines, cursorLine, cursorCol);

      // If there's a selection, replace it
      if (selection) {
        // Normalize selection to always have start before end
        const isForward = selection.startLine < selection.endLine ||
          (selection.startLine === selection.endLine && selection.startCol <= selection.endCol);

        const start = isForward ?
          { line: selection.startLine, col: selection.startCol } :
          { line: selection.endLine, col: selection.endCol };
        const end = isForward ?
          { line: selection.endLine, col: selection.endCol } :
          { line: selection.startLine, col: selection.startCol };

        if (start.line === end.line) {
          // Selection on same line - replace with input
          const lineText = lines[start.line].text;
          const newText = lineText.substring(0, start.col) + input + lineText.substring(end.col);
          const newLines = [...lines];
          newLines[start.line] = { ...newLines[start.line], text: newText };
          setLines(newLines);
          setCursorLine(start.line);
          setCursorCol(start.col + input.length);
        } else {
          // Multi-line selection - replace with input
          const firstLineText = lines[start.line].text.substring(0, start.col);
          const lastLineText = lines[end.line].text.substring(end.col);
          const newText = firstLineText + input + lastLineText;

          const newLines = [
            ...lines.slice(0, start.line),
            { ...lines[start.line], text: newText },
            ...lines.slice(end.line + 1),
          ];
          setLines(newLines);
          setCursorLine(start.line);
          setCursorCol(start.col + input.length);
        }
        setSelection(null);
      } else {
        // No selection - insert normally
        const newText = currentLineText.substring(0, cursorCol) + input + currentLineText.substring(cursorCol);
        const newLines = [...lines];
        newLines[cursorLine] = { ...newLines[cursorLine], text: newText };
        setLines(newLines);
        setCursorCol(cursorCol + input.length);
      }
    }
  }, { isActive: isFocused });

  // Calculate visible lines based on scroll offset
  const visibleLines = lines.slice(scrollOffset, scrollOffset + viewportHeight);
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + viewportHeight < lines.length;
  const totalLines = lines.length;

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Scroll indicator - top */}
      {hasMoreAbove && (
        <Box>
          <Text color="yellow" dimColor>{'    ↑ '}</Text>
          <Text color="yellow" dimColor>
            [Showing {scrollOffset + 1}-{Math.min(scrollOffset + viewportHeight, totalLines)} of {totalLines}]
          </Text>
        </Box>
      )}

      {/* Visible lines */}
      {visibleLines.map((line, visibleIndex) => {
        const actualIndex = scrollOffset + visibleIndex;
        const lineText = line.text || ' ';

        // Use the optimized rendering function that handles cursor, selection, and syntax highlighting
        const segments = highlightMarkdownLine(lineText);

        return (
          <Box key={line.id} flexDirection="row">
            <Text color="gray">{String(actualIndex + 1).padStart(3, ' ')} │ </Text>
            <Box flexDirection="row">
              {renderLineWithCursorAndSelection(lineText, cursorCol, segments, actualIndex, selection, cursorLine)}
            </Box>
          </Box>
        );
      })}

      {/* Scroll indicator - bottom */}
      {hasMoreBelow && (
        <Box>
          <Text color="yellow" dimColor>{'    ↓ '}</Text>
          <Text color="yellow" dimColor>
            [{totalLines - (scrollOffset + viewportHeight)} more lines below]
          </Text>
        </Box>
      )}
    </Box>
  );
}
