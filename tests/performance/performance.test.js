import { describe, it, expect } from '@jest/globals';
import { highlightMarkdownLine } from '../../src/utils/syntaxHighlight.js';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Performance Tests', () => {
  // Performance threshold constants (in milliseconds)
  const THRESHOLDS = {
    SYNTAX_HIGHLIGHT_LINE: 5,      // Per line
    SYNTAX_HIGHLIGHT_1000_LINES: 100,
    LARGE_FILE_READ: 500,          // 10MB file
    LARGE_FILE_WRITE: 500,
  };

  describe('Syntax Highlighting Performance', () => {
    it('should highlight a simple line quickly', () => {
      const line = '# This is a heading with **bold** and *italic* text';

      const start = performance.now();
      const result = highlightMarkdownLine(line);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(THRESHOLDS.SYNTAX_HIGHLIGHT_LINE);
    });

    it('should highlight a complex line with multiple formats quickly', () => {
      const line = '- **Bold** *italic* `code` [link](url) _underline_ and normal text';

      const start = performance.now();
      const result = highlightMarkdownLine(line);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(THRESHOLDS.SYNTAX_HIGHLIGHT_LINE);
    });

    it('should highlight 1000 lines within acceptable time', () => {
      const lines = [
        '# Heading 1',
        'Regular text with **bold** and *italic*',
        '- List item 1',
        '- List item 2',
        '```javascript',
        'const code = "example";',
        '```',
        '> Blockquote',
        '[Link text](https://example.com)',
        '---',
      ];

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        highlightMarkdownLine(lines[i % lines.length]);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(THRESHOLDS.SYNTAX_HIGHLIGHT_1000_LINES);
    });

    it('should handle very long lines efficiently', () => {
      // Create a line with 1000 characters
      const longLine = 'This is a very long line with **bold** text. '.repeat(20);

      const start = performance.now();
      const result = highlightMarkdownLine(longLine);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(THRESHOLDS.SYNTAX_HIGHLIGHT_LINE * 2); // Allow 2x for long lines
    });

    it('should handle nested formatting patterns efficiently', () => {
      const line = '**Bold with `code` inside** and *italic with [link](url) inside*';

      const start = performance.now();
      const result = highlightMarkdownLine(line);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(THRESHOLDS.SYNTAX_HIGHLIGHT_LINE);
    });

    it('should handle lines with many inline code blocks', () => {
      const line = 'Code: `one` `two` `three` `four` `five` `six` `seven` `eight` `nine` `ten`';

      const start = performance.now();
      const result = highlightMarkdownLine(line);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(THRESHOLDS.SYNTAX_HIGHLIGHT_LINE);
    });
  });

  describe('File I/O Performance', () => {
    const testDir = tmpdir();

    it('should read a 1MB file quickly', () => {
      const testFile = join(testDir, 'perf-test-1mb.md');

      // Create 1MB of markdown content (~20,000 lines of 50 chars each)
      const line = '# Heading with **bold** and *italic* text\n';
      const content = line.repeat(25000); // Increase to ensure > 1MB
      writeFileSync(testFile, content, 'utf-8');

      const start = performance.now();
      const readContent = readFileSync(testFile, 'utf-8');
      const duration = performance.now() - start;

      expect(readContent.length).toBeGreaterThan(1000000);
      expect(duration).toBeLessThan(100); // 1MB should read very fast

      // Cleanup
      unlinkSync(testFile);
    });

    it('should write a 1MB file quickly', () => {
      const testFile = join(testDir, 'perf-test-write-1mb.md');

      // Create 1MB of content
      const line = '# Heading with **bold** and *italic* text\n';
      const content = line.repeat(20000);

      const start = performance.now();
      writeFileSync(testFile, content, 'utf-8');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // 1MB should write very fast

      // Cleanup
      unlinkSync(testFile);
    });

    it('should handle large file (10MB) read within threshold', () => {
      const testFile = join(testDir, 'perf-test-10mb.md');

      // Create 10MB of markdown content
      const line = '# Heading with **bold** and *italic* text\n';
      const content = line.repeat(250000); // Increase to ensure > 10MB
      writeFileSync(testFile, content, 'utf-8');

      const start = performance.now();
      const readContent = readFileSync(testFile, 'utf-8');
      const duration = performance.now() - start;

      expect(readContent.length).toBeGreaterThan(10000000);
      expect(duration).toBeLessThan(THRESHOLDS.LARGE_FILE_READ);

      // Cleanup
      unlinkSync(testFile);
    }, 15000); // Increase timeout for large file

    it('should handle large file (10MB) write within threshold', () => {
      const testFile = join(testDir, 'perf-test-write-10mb.md');

      // Create 10MB of content
      const line = '# Heading with **bold** and *italic* text\n';
      const content = line.repeat(250000); // Match read test

      const start = performance.now();
      writeFileSync(testFile, content, 'utf-8');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(THRESHOLDS.LARGE_FILE_WRITE);

      // Cleanup
      unlinkSync(testFile);
    }, 15000); // Increase timeout for large file
  });

  describe('Rendering Performance', () => {
    it('should split large text into lines efficiently', () => {
      // Create 10,000 lines of text
      const lines = Array.from({ length: 10000 }, (_, i) => `Line ${i + 1} with content`);
      const content = lines.join('\n');

      const start = performance.now();
      const splitLines = content.split('\n');
      const duration = performance.now() - start;

      expect(splitLines.length).toBe(10000);
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should handle rapid content updates efficiently', () => {
      let content = '# Initial content\n\nSome text here.';

      const start = performance.now();

      // Simulate 100 rapid edits
      for (let i = 0; i < 100; i++) {
        content += `\nNew line ${i}`;
        content.split('\n'); // Simulate parsing
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should handle updates quickly
    });

    it('should handle highlighting many lines efficiently', () => {
      // Create varied content
      const lines = [
        '# Heading',
        'Paragraph with **bold** and *italic*',
        '- List item',
        '```javascript',
        'code block',
        '```',
        '> Quote',
        '[Link](url)',
      ];

      const content = lines.join('\n').repeat(100); // 800 lines
      const allLines = content.split('\n');

      const start = performance.now();
      allLines.forEach(line => highlightMarkdownLine(line));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200); // Should highlight 800 lines quickly
    });
  });

  describe('Memory Efficiency', () => {
    it('should not create excessive garbage for repeated highlights', () => {
      const line = '# Heading with **bold** and *italic* text';

      // Warm up
      for (let i = 0; i < 100; i++) {
        highlightMarkdownLine(line);
      }

      const start = performance.now();
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        highlightMarkdownLine(line);
      }

      const duration = performance.now() - start;
      const avgDuration = duration / iterations;

      // Should maintain consistent performance (no memory leak slowdown)
      expect(avgDuration).toBeLessThan(0.1); // Less than 0.1ms per highlight
    });

    it('should handle alternating line types efficiently', () => {
      const lineTypes = [
        '# Heading',
        'Regular text',
        '- List item',
        '```',
        '> Quote',
        '[Link](url)',
        '**Bold** text',
        '---',
      ];

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        highlightMarkdownLine(lineTypes[i % lineTypes.length]);
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(THRESHOLDS.SYNTAX_HIGHLIGHT_1000_LINES);
    });
  });

  describe('Edge Cases Performance', () => {
    it('should handle empty lines efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        highlightMarkdownLine('');
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should handle lines with no formatting efficiently', () => {
      const line = 'This is plain text with no formatting at all just regular words.';

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        highlightMarkdownLine(line);
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should be fast for plain text
    });

    it('should handle lines with many special characters', () => {
      const line = '***###___```[[[]]]***###___```***###___```';

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        highlightMarkdownLine(line);
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});
