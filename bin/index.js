import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { render } from 'ink';
import App from '../src/App.jsx';
import FileExplorerApp from '../src/FileExplorerApp.jsx';
import { loadConfig, ensureDefaultLocation, resolveFilePath } from '../src/utils/config.js';

// Load user configuration
const config = loadConfig();

// Ensure default location exists
ensureDefaultLocation(config);

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [file] [options]\n\nIf no file is specified, a file explorer will open.')
  .command('$0 [file]', 'Open a markdown file for editing or browse files', (yargs) => {
    yargs.positional('file', {
      describe: 'Path to the markdown file (optional - opens file explorer if omitted)',
      type: 'string',
    });
  })
  .option('layout', {
    alias: 'l',
    describe: 'Preview layout',
    choices: ['side', 'bottom'],
  })
  .option('no-preview', {
    describe: 'Disable preview pane',
    type: 'boolean',
  })
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .parseSync();

// If no file specified, show file explorer
if (!argv.file) {
  render(
    React.createElement(FileExplorerApp, {
      config,
    })
  );
} else {
  // Resolve file path based on config
  // If no directory in path (e.g., "file.md"), use default location
  // If has directory (e.g., "folder/file.md"), create in default location
  const filePath = resolveFilePath(argv.file, config);
  let initialContent = '';

  // Read file if it exists, otherwise create new
  if (existsSync(filePath)) {
    try {
      initialContent = readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log(`Creating new file at: ${filePath}`);
  }

  // Render the app using config defaults with CLI overrides
  render(
    React.createElement(App, {
      filePath,
      initialContent,
      layout: argv.layout || config.layout,
      showPreview: argv.noPreview !== undefined ? !argv.noPreview : config.showPreview,
      config,
    })
  );
}
