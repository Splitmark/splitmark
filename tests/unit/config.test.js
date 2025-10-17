import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { loadConfig, resolveFilePath, getConfigPath, ensureDefaultLocation, DEFAULT_CONFIG } from '../../src/utils/config.js';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

describe('Config utilities', () => {
  const testConfigPath = join(homedir(), '.splitmarkrc-test');
  const testDir = join(homedir(), 'test-splitmark-dir');

  afterEach(() => {
    // Clean up test files
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getConfigPath', () => {
    it('should return path to .splitmarkrc in home directory', () => {
      const configPath = getConfigPath();
      expect(configPath).toBe(join(homedir(), '.splitmarkrc'));
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', () => {
      const config = loadConfig();
      expect(config).toHaveProperty('defaultLocation');
      expect(config).toHaveProperty('layout');
      expect(config).toHaveProperty('showPreview');
      expect(config).toHaveProperty('columnWidthRatio');
      expect(config).toHaveProperty('format');
      expect(config).toHaveProperty('theme');
      expect(config.layout).toBe('side');
      expect(config.showPreview).toBe(true);
      expect(config.format.wrapColumn).toBe(80);
    });

    it('should load and merge custom config', () => {
      // Save to actual config path for this test
      const actualConfigPath = getConfigPath();
      const existingConfig = existsSync(actualConfigPath) ? readFileSync(actualConfigPath, 'utf-8') : null;

      const customConfig = {
        defaultLocation: '/custom/path',
        layout: 'stacked',
      };
      writeFileSync(actualConfigPath, JSON.stringify(customConfig, null, 2));

      const config = loadConfig();
      expect(config.defaultLocation).toBe('/custom/path');
      expect(config.layout).toBe('stacked');
      expect(config.showPreview).toBe(true); // Default value preserved
      expect(config.format.wrapColumn).toBe(80);

      // Restore original config
      if (existingConfig) {
        writeFileSync(actualConfigPath, existingConfig);
      } else {
        unlinkSync(actualConfigPath);
      }
    });
  });

  describe('resolveFilePath', () => {
    const config = { defaultLocation: testDir };

    it('should resolve simple filenames to default location', () => {
      const resolved = resolveFilePath('test.md', config);
      expect(resolved).toBe(join(testDir, 'test.md'));
    });

    it('should preserve absolute paths', () => {
      const absolutePath = '/absolute/path/test.md';
      const resolved = resolveFilePath(absolutePath, config);
      expect(resolved).toBe(absolutePath);
    });

    it('should preserve Windows absolute paths', () => {
      const absolutePath = 'C:\\absolute\\path\\test.md';
      const resolved = resolveFilePath(absolutePath, config);
      expect(resolved).toBe(absolutePath);
    });

    it('should preserve relative paths starting with ./', () => {
      const relativePath = './relative/test.md';
      const resolved = resolveFilePath(relativePath, config);
      expect(resolved).toBe(relativePath);
    });

    it('should preserve relative paths starting with ../', () => {
      const relativePath = '../relative/test.md';
      const resolved = resolveFilePath(relativePath, config);
      expect(resolved).toBe(relativePath);
    });

    it('should create directories for paths in default location', () => {
      const resolved = resolveFilePath('subdir/test.md', config);
      expect(resolved).toBe(join(testDir, 'subdir', 'test.md'));
      expect(existsSync(join(testDir, 'subdir'))).toBe(true);
    });
  });

  describe('ensureDefaultLocation', () => {
    it('should create default location directory if it does not exist', () => {
      const config = { defaultLocation: testDir };
      ensureDefaultLocation(config);
      expect(existsSync(testDir)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      mkdirSync(testDir, { recursive: true });
      const config = { defaultLocation: testDir };
      expect(() => ensureDefaultLocation(config)).not.toThrow();
    });
  });
});
