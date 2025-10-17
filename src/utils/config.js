import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir, platform } from 'os';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

const CONFIG_FILE = join(homedir(), '.splitmarkrc');

/**
 * Get the platform-specific Documents folder
 * Handles Windows OneDrive redirection and standard paths for Mac/Linux
 */
function getDocumentsFolder() {
  const plat = platform();

  if (plat === 'win32') {
    try {
      // Use PowerShell to get the actual Documents folder (handles OneDrive)
      const result = execSync(
        'powershell -Command "[Environment]::GetFolderPath(\'MyDocuments\')"',
        { encoding: 'utf8' }
      );
      return result.trim();
    } catch (error) {
      // Fallback to standard Windows path if PowerShell fails
      return join(homedir(), 'Documents');
    }
  } else if (plat === 'darwin') {
    // macOS
    return join(homedir(), 'Documents');
  } else {
    // Linux and others - use XDG standard or fallback
    const xdgDocuments = process.env.XDG_DOCUMENTS_DIR;
    if (xdgDocuments) {
      return xdgDocuments;
    }
    return join(homedir(), 'Documents');
  }
}

// Default configuration
const DEFAULT_CONFIG = {
  defaultLocation: join(getDocumentsFolder(), 'Splitmark'),
  layout: 'side', // 'side' or 'bottom'
  showPreview: true,
  columnWidthRatio: 75, // Editor width percentage for side-by-side
  format: {
    wrapColumn: 80,
  },
  theme: {
    // VSCode Dark+ inspired colors
    editor: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      lineNumber: '#858585',
      cursor: '#ffffff',
      selection: '#264f78',
    },
    syntax: {
      keyword: '#C586C0',
      string: '#CE9178',
      number: '#B5CEA8',
      comment: '#6A9955',
      function: '#DCDCAA',
      variable: '#9CDCFE',
      type: '#4EC9B0',
      operator: '#D4D4D4',
    },
    preview: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      heading: '#ffffff',
      link: '#3794ff',
      code: {
        background: '#2d2d2d',
        foreground: '#d4d4d4',
      },
    },
  },
};

/**
 * Load configuration from ~/.splitmarkrc
 * Creates default config file if it doesn't exist
 */
export function loadConfig() {
  try {
    if (!existsSync(CONFIG_FILE)) {
      // Create default config file
      saveConfig(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }

    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const userConfig = JSON.parse(content);

    // Merge with defaults to ensure all keys exist
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      format: {
        ...DEFAULT_CONFIG.format,
        ...(userConfig.format || {}),
      },
      theme: {
        ...DEFAULT_CONFIG.theme,
        ...(userConfig.theme || {}),
        editor: {
          ...DEFAULT_CONFIG.theme.editor,
          ...(userConfig.theme?.editor || {}),
        },
        syntax: {
          ...DEFAULT_CONFIG.theme.syntax,
          ...(userConfig.theme?.syntax || {}),
        },
        preview: {
          ...DEFAULT_CONFIG.theme.preview,
          ...(userConfig.theme?.preview || {}),
          code: {
            ...DEFAULT_CONFIG.theme.preview.code,
            ...(userConfig.theme?.preview?.code || {}),
          },
        },
      },
    };
  } catch (error) {
    console.error(`Warning: Could not load config from ${CONFIG_FILE}: ${error.message}`);
    console.error('Using default configuration');
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to ~/.splitmarkrc
 */
export function saveConfig(config) {
  try {
    const content = JSON.stringify(config, null, 2);
    writeFileSync(CONFIG_FILE, content, 'utf-8');
  } catch (error) {
    console.error(`Error saving config to ${CONFIG_FILE}: ${error.message}`);
  }
}

/**
 * Ensure the default location directory exists
 */
export function ensureDefaultLocation(config) {
  try {
    const defaultLocation = config.defaultLocation || DEFAULT_CONFIG.defaultLocation;
    if (!existsSync(defaultLocation)) {
      mkdirSync(defaultLocation, { recursive: true });
    }
    return defaultLocation;
  } catch (error) {
    console.error(`Error creating default location: ${error.message}`);
    return null;
  }
}

/**
 * Resolve file path based on config
 * If path has no directory component and no ./ prefix, use default location
 * If path has directory component (e.g., "folder/file.md"), create in default location
 */
export function resolveFilePath(inputPath, config) {
  const defaultLocation = config.defaultLocation || DEFAULT_CONFIG.defaultLocation;

  // If it's an absolute path, use it as-is
  if (inputPath.startsWith('/') || inputPath.match(/^[A-Za-z]:\\/)) {
    return inputPath;
  }

  // If it starts with ./ or ../, use it relative to current directory
  if (inputPath.startsWith('./') || inputPath.startsWith('../')) {
    return inputPath;
  }

  // Otherwise, resolve relative to default location
  const resolvedPath = join(defaultLocation, inputPath);

  // Ensure the directory exists
  const directory = dirname(resolvedPath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }

  return resolvedPath;
}

/**
 * Get configuration file path
 */
export function getConfigPath() {
  return CONFIG_FILE;
}

// Export DEFAULT_CONFIG as named export
export { DEFAULT_CONFIG };

export default {
  loadConfig,
  saveConfig,
  ensureDefaultLocation,
  resolveFilePath,
  getConfigPath,
  DEFAULT_CONFIG,
};
