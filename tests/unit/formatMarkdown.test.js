import { formatMarkdown } from '../../src/utils/formatMarkdown.js';

describe('formatMarkdown', () => {
  it('normalizes headings and ensures a trailing newline', () => {
    const input = '#Heading\n\nSome text';
    const output = formatMarkdown(input);
    expect(output).toBe('# Heading\n\nSome text\n');
  });

  it('collapses excessive blank lines and trims list spacing', () => {
    const input = '-   item one\n\n\n-    item two';
    const output = formatMarkdown(input);
    expect(output).toBe('- item one\n\n- item two\n');
  });

  it('preserves code fences without altering inner content', () => {
    const input = '```js\nconst value = 1;  \n```\n';
    const output = formatMarkdown(input);
    expect(output).toBe('```js\nconst value = 1;  \n```\n');
  });
});
