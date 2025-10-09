/**
 * Parse a Markdown line and return segments with color information
 * Returns array of { text, color, bold, italic } objects
 */
export function highlightMarkdownLine(line) {
  const segments = [];

  // Empty line
  if (!line || line.trim() === '') {
    return [{ text: line || ' ', color: undefined }];
  }

  // Headers (# ## ### etc) - using pre-compiled regex
  if (HEADER_REGEX.test(line)) {
    const match = line.match(HEADER_MATCH_REGEX);
    if (match) {
      return [
        { text: match[1], color: 'magenta', bold: true },
        { text: match[2], color: 'magenta' }
      ];
    }
  }

  // Code blocks (```) - using pre-compiled regex
  if (CODE_BLOCK_REGEX.test(line)) {
    return [{ text: line, color: 'cyan' }];
  }

  // Blockquote (>) - using pre-compiled regex
  if (BLOCKQUOTE_REGEX.test(line)) {
    return [{ text: line, color: 'yellow' }];
  }

  // Horizontal rule (---, ***, ___) - using pre-compiled regex
  if (HORIZONTAL_RULE_REGEX.test(line.trim())) {
    return [{ text: line, color: 'gray' }];
  }

  // List items (-, *, +, 1.) - using pre-compiled regex
  if (LIST_ITEM_REGEX.test(line)) {
    const match = line.match(LIST_ITEM_MATCH_REGEX);
    if (match) {
      return [
        { text: match[1], color: undefined },
        { text: match[2], color: 'green', bold: true },
        { text: match[3], color: undefined }
      ];
    }
  }

  // For regular text, apply inline formatting
  return parseInlineFormatting(line);
}

// Pre-compile regex patterns for inline formatting (performance optimization)
const INLINE_PATTERNS = [
  { regex: /\*\*([^*]+)\*\*/g, color: 'blue', bold: true },     // **bold**
  { regex: /\*([^*]+)\*/g, color: 'blue', italic: true },        // *italic*
  { regex: /_([^_]+)_/g, color: 'blue', italic: true },          // _italic_
  { regex: /`([^`]+)`/g, color: 'cyan' },                        // `code`
  { regex: /\[([^\]]+)\]\([^)]+\)/g, color: 'blue' },           // [link](url)
];

// Pre-compile line-level regex patterns (performance optimization)
const HEADER_REGEX = /^#{1,6}\s/;
const HEADER_MATCH_REGEX = /^(#{1,6}\s)(.*)$/;
const CODE_BLOCK_REGEX = /^```/;
const BLOCKQUOTE_REGEX = /^>\s/;
const HORIZONTAL_RULE_REGEX = /^(\*{3,}|-{3,}|_{3,})$/;
const LIST_ITEM_REGEX = /^(\s*)([-*+]|\d+\.)\s/;
const LIST_ITEM_MATCH_REGEX = /^(\s*)([-*+]|\d+\.)(\s.*)$/;

/**
 * Parse inline formatting like **bold**, *italic*, `code`, [links]
 */
function parseInlineFormatting(line) {
  const segments = [];
  let pos = 0;

  // Find all matches with their positions using pre-compiled patterns
  const matches = [];
  for (const pattern of INLINE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(line)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        color: pattern.color,
        bold: pattern.bold,
        italic: pattern.italic
      });
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build segments, handling overlaps
  let lastEnd = 0;
  for (const match of matches) {
    // Add text before this match
    if (match.start > lastEnd) {
      segments.push({ text: line.substring(lastEnd, match.start), color: undefined });
    }

    // Add the formatted match
    if (match.end > lastEnd) {
      segments.push({
        text: match.text,
        color: match.color,
        bold: match.bold,
        italic: match.italic
      });
      lastEnd = match.end;
    }
  }

  // Add remaining text
  if (lastEnd < line.length) {
    segments.push({ text: line.substring(lastEnd), color: undefined });
  }

  // If no segments were created, return the whole line
  if (segments.length === 0) {
    segments.push({ text: line, color: undefined });
  }

  return segments;
}
