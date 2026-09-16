import { render } from 'ink-testing-library';
import { describe, it, expect } from '@jest/globals';
import TextBuffer from '../../src/components/TextBuffer.jsx';

// Ink hands a pasted string to useInput as a single multi-character `input`,
// and a large paste can arrive as several stdin chunks before React re-renders.
// These tests drive TextBuffer the same way.

const tick = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));
const ESC = String.fromCharCode(27);
const RIGHT = `${ESC}[C`;
const SHIFT_RIGHT = `${ESC}[1;2C`;

function mount(content = '') {
  const changes = [];
  const instance = render(
    <TextBuffer
      content={content}
      onChange={(value) => changes.push(value)}
      isFocused={true}
      viewportHeight={10}
      editorWidth={80}
    />
  );
  return { ...instance, latest: () => changes[changes.length - 1] };
}

async function pressKeys(stdin, sequence, times) {
  for (let i = 0; i < times; i++) {
    stdin.write(sequence);
    await tick(10);
  }
}

describe('TextBuffer pasted input', () => {
  describe('a single chunk containing several lines', () => {
    it('splits CRLF line endings into separate lines', async () => {
      const { stdin, latest, lastFrame } = mount('');
      await tick();
      stdin.write('line one\r\nline two\r\nline three');
      await tick();
      expect(latest()).toBe('line one\nline two\nline three');
      expect(lastFrame()).toContain('  3 │ line three');
    });

    it('splits CR-only line endings (Windows Terminal pastes newlines as CR)', async () => {
      const { stdin, latest, lastFrame } = mount('');
      await tick();
      stdin.write('alpha\rbeta\rgamma');
      await tick();
      expect(latest()).toBe('alpha\nbeta\ngamma');
      expect(lastFrame()).toContain('  3 │ gamma');
    });

    it('splits LF line endings into separate line objects', async () => {
      const { stdin, latest, lastFrame } = mount('');
      await tick();
      stdin.write('one\ntwo');
      await tick();
      expect(latest()).toBe('one\ntwo');
      expect(lastFrame()).toContain('  2 │ two');
    });

    it('converts tabs to two spaces, matching the Tab key', async () => {
      const { stdin, latest } = mount('');
      await tick();
      stdin.write('a\tb');
      await tick();
      expect(latest()).toBe('a  b');
    });

    it('inserts at the cursor and keeps the text after the cursor on the last pasted line', async () => {
      const { stdin, latest } = mount('start end');
      await tick();
      await pressKeys(stdin, RIGHT, 6);
      stdin.write('X\r\nY');
      await tick();
      expect(latest()).toBe('start X\nYend');
    });

    it('replaces the current selection with the pasted lines', async () => {
      const { stdin, latest } = mount('hello world');
      await tick();
      await pressKeys(stdin, SHIFT_RIGHT, 5);
      stdin.write('A\r\nB');
      await tick();
      expect(latest()).toBe('A\nB world');
    });
  });

  describe('chunks arriving before React re-renders', () => {
    it('keeps both chunks when they arrive in the same tick', async () => {
      const { stdin, latest } = mount('');
      await tick();
      stdin.write('hello ');
      stdin.write('world');
      await tick();
      expect(latest()).toBe('hello world');
    });

    it('keeps both chunks when they arrive one setImmediate apart', async () => {
      const { stdin, latest } = mount('');
      await tick();
      stdin.write('hello ');
      await new Promise((resolve) => setImmediate(resolve));
      stdin.write('world');
      await tick();
      expect(latest()).toBe('hello world');
    });

    it('keeps every line when a multi-line paste is split across chunks', async () => {
      const { stdin, latest } = mount('');
      await tick();
      stdin.write('one\r\ntw');
      stdin.write('o\r\nthree');
      await tick();
      expect(latest()).toBe('one\ntwo\nthree');
    });
  });
});
