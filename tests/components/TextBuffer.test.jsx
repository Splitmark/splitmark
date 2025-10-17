import { describe, it, expect } from '@jest/globals';
import { appendBlankLineToEnd } from '../../src/components/TextBuffer.jsx';

describe('TextBuffer helpers', () => {
  it('appendBlankLineToEnd adds a blank line without mutating original array', () => {
    const originalLines = [
      { id: 'line-1', text: 'Hello' },
      { id: 'line-2', text: 'World' },
    ];

    const result = appendBlankLineToEnd(originalLines);

    expect(result).not.toBe(originalLines);
    expect(result).toHaveLength(originalLines.length + 1);
    expect(result.slice(0, originalLines.length)).toEqual(originalLines);
    expect(result[result.length - 1].text).toBe('');
    expect(result[result.length - 1].id).toMatch(/^line-/);
  });
});
