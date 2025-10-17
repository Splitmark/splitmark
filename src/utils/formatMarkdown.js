/**
 * Wrap text to the requested width while keeping whole words together.
 * Words longer than the width are left intact to avoid losing information.
 *
 * @param {string} text
 * @param {number} width
 * @returns {string[]}
 */
function wrapText(text, width) {
  if (!text || text.length <= width) {
    return text ? [text] : [];
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

const DEFAULT_WIDTH = 80;

/**
 * Light-weight Markdown formatter inspired by Prettier's defaults.
 *
 * The formatter normalises whitespace, collapses consecutive blank lines,
 * enforces spaces after Markdown markers (e.g. headings, lists, block quotes)
 * and wraps free-form paragraphs to a configurable width.
 *
 * @param {string} source Markdown source to format.
 * @param {{ wrapColumn?: number }} [options]
 * @returns {string}
 */
export function formatMarkdown(source, options = {}) {
  if (typeof source !== 'string') {
    return '';
  }

  const wrapColumn = Math.max(20, options.wrapColumn || DEFAULT_WIDTH);
  const lines = source.split('\n');
  const formattedLines = [];

  let paragraphBuffer = [];
  let insideFence = false;
  let fenceMarker = '';
  let previousBlank = false;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return;
    }

    const paragraphText = paragraphBuffer
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (paragraphText.length === 0) {
      if (!previousBlank) {
        formattedLines.push('');
        previousBlank = true;
      }
      paragraphBuffer = [];
      return;
    }

    const wrapped = wrapText(paragraphText, wrapColumn);
    wrapped.forEach((line) => {
      formattedLines.push(line);
    });

    paragraphBuffer = [];
    previousBlank = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedRight = rawLine.replace(/\s+$/, '');
    const trimmed = trimmedRight.trim();

    if (!insideFence) {
      if (/^(```|~~~)/.test(trimmed)) {
        flushParagraph();
        formattedLines.push(trimmedRight);
        insideFence = true;
        fenceMarker = trimmed.slice(0, 3);
        previousBlank = false;
        continue;
      }

      if (trimmed.length === 0) {
        flushParagraph();
        if (!previousBlank && (formattedLines.length > 0 || i < lines.length - 1)) {
          formattedLines.push('');
          previousBlank = true;
        }
        continue;
      }

      if (/^<.*>$/.test(trimmed)) {
        // Treat standalone HTML blocks as paragraph breakers.
        flushParagraph();
        formattedLines.push(trimmedRight);
        previousBlank = false;
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
      if (headingMatch) {
        flushParagraph();
        const [, hashes, text] = headingMatch;
        const headingText = text.trim();
        formattedLines.push(`${hashes} ${headingText}`.trimEnd());
        previousBlank = false;
        continue;
      }

      const hrMatch = trimmed.match(/^([*_\-])\1{2,}$/);
      if (hrMatch) {
        flushParagraph();
        const char = hrMatch[1];
        formattedLines.push(char.repeat(3));
        previousBlank = false;
        continue;
      }

      const listMatch = trimmedRight.match(/^(\s*)([-*+])\s*(.*)$/);
      if (listMatch) {
        flushParagraph();
        const [, indent, marker, text] = listMatch;
        const cleaned = text.replace(/\s+/g, ' ').trim();
        const lineText = cleaned.length > 0 ? `${indent}${marker} ${cleaned}` : `${indent}${marker}`;
        formattedLines.push(lineText);
        previousBlank = false;
        continue;
      }

      const orderedMatch = trimmedRight.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (orderedMatch) {
        flushParagraph();
        const [, indent, index, text] = orderedMatch;
        const cleaned = text.replace(/\s+/g, ' ').trim();
        const lineText = cleaned.length > 0 ? `${indent}${index}. ${cleaned}` : `${indent}${index}.`;
        formattedLines.push(lineText);
        previousBlank = false;
        continue;
      }

      const blockQuoteMatch = trimmedRight.match(/^(\s*)>\s*(.*)$/);
      if (blockQuoteMatch) {
        flushParagraph();
        const [, indent, text] = blockQuoteMatch;
        const cleaned = text.replace(/\s+/g, ' ').trim();
        const prefix = `${indent}>`;
        const quoteLines = cleaned.length > 0 ? wrapText(cleaned, Math.max(wrapColumn - prefix.length - 1, 20)) : [];

        if (quoteLines.length === 0) {
          formattedLines.push(`${prefix}`);
        } else {
          formattedLines.push(`${prefix} ${quoteLines[0]}`);
          for (let qi = 1; qi < quoteLines.length; qi++) {
            formattedLines.push(`${indent}> ${quoteLines[qi]}`);
          }
        }
        previousBlank = false;
        continue;
      }

      if (/^\s*\|.*\|\s*$/.test(trimmedRight)) {
        flushParagraph();
        formattedLines.push(trimmedRight.replace(/\s+\|/g, ' |').replace(/\|\s+/g, '| '));
        previousBlank = false;
        continue;
      }

      if (/^\s{4,}/.test(trimmedRight)) {
        // Indented code block - keep as-is.
        flushParagraph();
        formattedLines.push(trimmedRight);
        previousBlank = false;
        continue;
      }

      paragraphBuffer.push(trimmedRight);
      previousBlank = false;
    } else {
      formattedLines.push(trimmedRight);
      const fenceClose = trimmed.startsWith(fenceMarker);
      if (fenceClose) {
        insideFence = false;
        fenceMarker = '';
      }
      previousBlank = false;
    }
  }

  flushParagraph();

  // Collapse trailing blank lines to a single newline if the original ended with one
  while (formattedLines.length > 1 && formattedLines[formattedLines.length - 1] === '' && formattedLines[formattedLines.length - 2] === '') {
    formattedLines.pop();
  }

  return formattedLines.join('\n');
}

export default formatMarkdown;
