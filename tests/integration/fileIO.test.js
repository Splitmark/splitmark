import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveFilePath, loadConfig, getConfigPath } from '../../src/utils/config.js';

describe('File I/O Integration Tests', () => {
  const testDir = join(tmpdir(), 'splitmark-test-io');
  const testConfig = { defaultLocation: testDir };

  beforeEach(() => {
    // Create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('File creation and editing workflow', () => {
    it('should create new markdown file in default location', () => {
      const fileName = 'test-note.md';
      const filePath = resolveFilePath(fileName, testConfig);
      const content = '# Test Note\n\nThis is a test.';

      // Write file
      writeFileSync(filePath, content, 'utf-8');

      // Verify file exists and contains correct content
      expect(existsSync(filePath)).toBe(true);
      const readContent = readFileSync(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should create nested directories when specified in filename', () => {
      const fileName = 'projects/ideas/brainstorm.md';
      const filePath = resolveFilePath(fileName, testConfig);
      const content = '# Brainstorm\n\n- Idea 1\n- Idea 2';

      // Resolve path creates directories
      expect(existsSync(join(testDir, 'projects', 'ideas'))).toBe(true);

      // Write file
      writeFileSync(filePath, content, 'utf-8');

      // Verify nested file exists
      expect(existsSync(filePath)).toBe(true);
      const readContent = readFileSync(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should handle file updates preserving content', () => {
      const fileName = 'editable.md';
      const filePath = resolveFilePath(fileName, testConfig);

      // Initial content
      const initialContent = '# Draft\n\nInitial text.';
      writeFileSync(filePath, initialContent, 'utf-8');

      // Update content
      const updatedContent = '# Final\n\nUpdated text with changes.';
      writeFileSync(filePath, updatedContent, 'utf-8');

      // Verify update
      const readContent = readFileSync(filePath, 'utf-8');
      expect(readContent).toBe(updatedContent);
      expect(readContent).not.toBe(initialContent);
    });

    it('should handle empty file creation', () => {
      const fileName = 'empty.md';
      const filePath = resolveFilePath(fileName, testConfig);

      // Create empty file
      writeFileSync(filePath, '', 'utf-8');

      // Verify file exists and is empty
      expect(existsSync(filePath)).toBe(true);
      const readContent = readFileSync(filePath, 'utf-8');
      expect(readContent).toBe('');
    });

    it('should handle files with special characters', () => {
      const fileName = 'file with spaces & symbols!.md';
      const filePath = resolveFilePath(fileName, testConfig);
      const content = '# Special File\n\nHas special chars.';

      writeFileSync(filePath, content, 'utf-8');

      expect(existsSync(filePath)).toBe(true);
      const readContent = readFileSync(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });
  });

  describe('Config file persistence', () => {
    it('should save and load custom configuration', () => {
      // Test with actual config file
      const actualConfigPath = getConfigPath();
      const existingConfig = existsSync(actualConfigPath) ? readFileSync(actualConfigPath, 'utf-8') : null;

      const customConfig = {
        defaultLocation: '/custom/path',
        layout: 'stacked',
        showPreview: false,
        columnWidthRatio: 60,
      };

      // Save config
      writeFileSync(actualConfigPath, JSON.stringify(customConfig, null, 2), 'utf-8');

      // Load config
      const loaded = loadConfig();

      // Verify custom fields
      expect(loaded.defaultLocation).toBe(customConfig.defaultLocation);
      expect(loaded.layout).toBe(customConfig.layout);
      expect(loaded.showPreview).toBe(customConfig.showPreview);
      expect(loaded.columnWidthRatio).toBe(customConfig.columnWidthRatio);

      // Restore original config
      if (existingConfig) {
        writeFileSync(actualConfigPath, existingConfig);
      } else {
        unlinkSync(actualConfigPath);
      }
    });

    it('should handle malformed config file gracefully', () => {
      const actualConfigPath = getConfigPath();
      const existingConfig = existsSync(actualConfigPath) ? readFileSync(actualConfigPath, 'utf-8') : null;

      // Write invalid JSON
      writeFileSync(actualConfigPath, '{ invalid json }', 'utf-8');

      // Should return default config without throwing
      const loaded = loadConfig();
      expect(loaded).toHaveProperty('defaultLocation');
      expect(loaded).toHaveProperty('layout');

      // Restore original config
      if (existingConfig) {
        writeFileSync(actualConfigPath, existingConfig);
      } else {
        unlinkSync(actualConfigPath);
      }
    });

    it('should merge partial config with defaults', () => {
      const actualConfigPath = getConfigPath();
      const existingConfig = existsSync(actualConfigPath) ? readFileSync(actualConfigPath, 'utf-8') : null;

      const partialConfig = {
        layout: 'stacked',
      };

      writeFileSync(actualConfigPath, JSON.stringify(partialConfig, null, 2), 'utf-8');

      const loaded = loadConfig();

      // Custom value
      expect(loaded.layout).toBe('stacked');

      // Default values preserved
      expect(loaded.showPreview).toBe(true);
      expect(loaded).toHaveProperty('theme');

      // Restore original config
      if (existingConfig) {
        writeFileSync(actualConfigPath, existingConfig);
      } else {
        unlinkSync(actualConfigPath);
      }
    });
  });

  describe('File path resolution', () => {
    it('should resolve relative paths from current directory', () => {
      const relativePath = './local-file.md';
      const resolved = resolveFilePath(relativePath, testConfig);

      // Should not modify relative path
      expect(resolved).toBe(relativePath);
    });

    it('should resolve absolute paths without modification', () => {
      const absolutePath = join(tmpdir(), 'absolute', 'path.md');
      const resolved = resolveFilePath(absolutePath, testConfig);

      expect(resolved).toBe(absolutePath);
    });

    it('should append simple filenames to default location', () => {
      const fileName = 'simple.md';
      const resolved = resolveFilePath(fileName, testConfig);

      expect(resolved).toBe(join(testDir, fileName));
    });

    it('should handle nested paths in default location', () => {
      const fileName = 'folder/subfolder/file.md';
      const resolved = resolveFilePath(fileName, testConfig);

      expect(resolved).toBe(join(testDir, 'folder', 'subfolder', 'file.md'));
      expect(existsSync(join(testDir, 'folder', 'subfolder'))).toBe(true);
    });
  });
});
