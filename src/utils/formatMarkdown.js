export function formatMarkdown(content) {
  if (typeof content !== 'string' || content.length === 0) {
    return '';
  }

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const formatted = [];

  let blankLineCount = 0;
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const trimmedEnd = originalLine.replace(/\s+$/u, '');
    const fenceMatch = trimmedEnd.trimStart().match(/^(?:```+|~~~+)(.*)$/);

    if (inCodeFence) {
      formatted.push(originalLine);
      if (fenceMatch) {
        inCodeFence = false;
        blankLineCount = 0;
      }
      continue;
    }

    if (fenceMatch) {
      formatted.push(trimmedEnd);
      inCodeFence = true;
      blankLineCount = 0;
      continue;
    }

    if (trimmedEnd.trim() === '') {
      if (formatted.length === 0) {
        continue;
      }
      blankLineCount += 1;
      if (blankLineCount > 1) {
        continue;
      }
      formatted.push('');
      continue;
    }

    blankLineCount = 0;
    let processedLine = trimmedEnd;

    const headingMatch = processedLine.match(/^(#{1,6})(\s*)(.*)$/);
    if (headingMatch) {
      const [, hashes, , text] = headingMatch;
      const headingText = text.trim();
      processedLine = headingText ? `${hashes} ${headingText}` : hashes;
      formatted.push(processedLine);
      continue;
    }

    const blockquoteMatch = processedLine.match(/^(\s*>+)(\s*)(.*)$/);
    if (blockquoteMatch) {
      const [, markers, , text] = blockquoteMatch;
      const quoteText = text.replace(/^\s+/, '');
      processedLine = quoteText ? `${markers} ${quoteText}` : markers;
      formatted.push(processedLine);
      continue;
    }

    const listMatch = processedLine.match(/^(\s*)(?:([-*+])|(\d+\.))(\s*)(.*)$/);
    if (listMatch) {
      const indent = listMatch[1] || '';
      const bullet = listMatch[2] || listMatch[3] || '';
      const listText = (listMatch[5] || '').replace(/^\s+/, '');
      const spacer = listText ? ' ' : '';
      processedLine = `${indent}${bullet}${spacer}${listText}`;
      formatted.push(processedLine);
      continue;
    }

    formatted.push(processedLine);
  }

  while (formatted.length > 0 && formatted[formatted.length - 1] === '') {
    formatted.pop();
  }

  if (formatted.length === 0) {
    return '';
  }

  let result = formatted.join('\n');
  if (!result.endsWith('\n')) {
    result += '\n';
  }
  return result;
}
