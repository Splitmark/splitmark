#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the actual app using tsx
const indexPath = join(__dirname, 'index.js');
const tsx = spawn('npx', ['tsx', indexPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
});

tsx.on('exit', (code) => {
  process.exit(code);
});
