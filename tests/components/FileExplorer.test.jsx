import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import FileExplorer from '../../src/components/FileExplorer.jsx';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileExplorer', () => {
  const testDir = join(tmpdir(), 'splitmark-test-explorer');
  let mockOnSelectFile;
  let mockOnExit;

  beforeEach(() => {
    // Create test directory structure
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Create test files
    mkdirSync(join(testDir, 'subdir'));
    writeFileSync(join(testDir, 'file1.md'), '# Test 1');
    writeFileSync(join(testDir, 'file2.md'), '# Test 2');
    writeFileSync(join(testDir, 'readme.txt'), 'Not markdown');
    writeFileSync(join(testDir, 'subdir', 'nested.md'), '# Nested');

    // Create mock functions
    mockOnSelectFile = jest.fn();
    mockOnExit = jest.fn();
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should render file explorer component', () => {
    const { lastFrame } = render(
      <FileExplorer
        initialPath={testDir}
        onSelectFile={mockOnSelectFile}
        onExit={mockOnExit}
      />
    );

    const output = lastFrame();

    // Should show the file explorer is rendered
    expect(output).toContain('Splitmark File Explorer');
    expect(output).toContain('Location:');
  });

  it('should show current path in header', () => {
    const { lastFrame } = render(
      <FileExplorer
        initialPath={testDir}
        onSelectFile={mockOnSelectFile}
        onExit={mockOnExit}
      />
    );

    const output = lastFrame();
    expect(output).toContain(testDir);
  });

  it('should show help text in footer', () => {
    const { lastFrame } = render(
      <FileExplorer
        initialPath={testDir}
        onSelectFile={mockOnSelectFile}
        onExit={mockOnExit}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Navigate');
    expect(output).toContain('Open');
    expect(output).toContain('New File');
    expect(output).toContain('Quit');
  });

  it('should display item count', () => {
    const { lastFrame } = render(
      <FileExplorer
        initialPath={testDir}
        onSelectFile={mockOnSelectFile}
        onExit={mockOnExit}
      />
    );

    const output = lastFrame();
    // Should show count of items (1 directory + 3 files = 4 items)
    expect(output).toContain('items');
  });
});
