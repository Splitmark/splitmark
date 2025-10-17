import { describe, it, expect } from '@jest/globals';
import { formatMarkdown } from '../../src/utils/formatMarkdown.js';

describe('formatMarkdown', () => {
  it('normalises spacing and wraps simple paragraphs', () => {
    const input = 'This   is  a paragraph with\nirregular   spacing that should be wrapped neatly.';
    const output = formatMarkdown(input, { wrapColumn: 40 });

    expect(output).toBe([
      'This is a paragraph with irregular',
      'spacing that should be wrapped neatly.'
    ].join('\n'));
  });

  it('enforces consistent bullet spacing', () => {
    const input = '-    first item\n  -second item';
    const output = formatMarkdown(input);

    expect(output).toBe(['- first item', '  - second item'].join('\n'));
  });

  it('preserves fenced code blocks', () => {
    const input = ['```js', 'const x = 1;  ', 'console.log(x);', '```'].join('\n');
    const output = formatMarkdown(input);

    expect(output).toBe(['```js', 'const x = 1;', 'console.log(x);', '```'].join('\n'));
  });
});
