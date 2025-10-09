import React, { useMemo, useState, useEffect, memo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { marked } from 'marked';
import CustomTerminalRenderer from '../utils/CustomTerminalRenderer.js';

/**
 * Helper function to strip ANSI codes for length calculation
 */
function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Helper function to wrap long lines while preserving ANSI codes
 */
function wrapLine(line, maxWidth) {
  if (!line || line.trim() === '') return [line];

  const visualLength = stripAnsi(line).length;
  if (visualLength <= maxWidth) return [line];

  // Simple approach: strip ANSI, wrap plain text, then re-apply formatting
  const plainText = stripAnsi(line);
  const wrappedLines = [];
  let currentLine = '';

  const words = plainText.split(' ');

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

  return wrappedLines.length > 0 ? wrappedLines : [line];
}

const Preview = memo(function Preview({ content, cursorLine = 0, viewportHeight = 20, previewWidth }) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const { stdout } = useStdout();

  // Use provided preview width or fall back to terminal width
  const effectiveWidth = previewWidth || stdout?.columns || 80;

  const rendered = useMemo(() => {
    try {
      // Create renderer with current preview width
      const renderer = new CustomTerminalRenderer({
        emoji: true,
        width: effectiveWidth,
        reflowText: true,
        previewWidth: effectiveWidth, // Pass width to renderer
        tableOptions: {
          chars: {
            top: '─',
            'top-mid': '┬',
            'top-left': '┌',
            'top-right': '┐',
            bottom: '─',
            'bottom-mid': '┴',
            'bottom-left': '└',
            'bottom-right': '┘',
            left: '│',
            'left-mid': '├',
            mid: '─',
            'mid-mid': '┼',
            right: '│',
            'right-mid': '┤',
            middle: '│',
          },
        },
      });

      // Configure marked with the renderer
      marked.setOptions({
        renderer: renderer,
        gfm: true, // Enable GitHub Flavored Markdown (includes tables)
        breaks: true, // Enable line breaks
        tables: true, // Explicitly enable table support
      });

      return marked(content || '');
    } catch (error) {
      return `Error rendering markdown: ${error.message}`;
    }
  }, [content, effectiveWidth]);

  // Split rendered content into lines (no wrapping to preserve ANSI codes)
  const renderedLines = useMemo(() => {
    const lines = rendered.split('\n');
    // Don't wrap - let Ink handle it naturally to preserve syntax highlighting
    return lines;
  }, [rendered]);

  // Calculate scroll position based on cursor line
  // Map editor line to preview scroll proportionally
  useEffect(() => {
    const contentLines = (content || '').split('\n').length;
    const previewLines = renderedLines.length;

    if (contentLines > 0 && previewLines > 0) {
      // Calculate proportional scroll position
      const scrollRatio = cursorLine / Math.max(contentLines - 1, 1);
      const targetScroll = Math.floor(scrollRatio * Math.max(previewLines - viewportHeight, 0));
      setScrollOffset(Math.max(0, targetScroll));
    }
  }, [cursorLine, content, renderedLines, viewportHeight]);

  // Show a window of lines from the scroll offset based on actual viewport height
  const visibleLines = renderedLines.slice(scrollOffset, scrollOffset + viewportHeight);

  // Pad with empty lines if we have fewer lines than viewport height
  const paddedLines = [...visibleLines];
  while (paddedLines.length < viewportHeight) {
    paddedLines.push(' '); // Space instead of empty string to ensure line renders
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      {paddedLines.map((line, index) => {
        // Ink's Text component preserves ANSI codes when passed as children
        // We need to make sure we're not stripping them
        return (
          <Text key={scrollOffset + index}>
            {line || ' '}
          </Text>
        );
      })}
    </Box>
  );
});

export default Preview;
