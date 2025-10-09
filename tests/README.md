# Splitmark Tests

This directory contains the test suite for the Splitmark CLI Markdown editor.

## Test Structure

```
tests/
├── unit/                    # Unit tests for utility functions
│   └── config.test.js       # Config loading, saving, and path resolution
├── integration/             # Integration tests
│   └── fileIO.test.js       # File I/O operations and config persistence
├── components/              # Component tests
│   └── FileExplorer.test.jsx # File explorer component
└── performance/             # Performance benchmarks
    └── performance.test.js  # Syntax highlighting, file I/O, and rendering performance
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test suites
```bash
npm run test:unit           # Run unit tests only
npm run test:integration    # Run integration tests only
npm run test:components     # Run component tests only
npm run test:performance    # Run performance tests only
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Framework

- **Jest** - Testing framework with ES modules support
- **@swc/jest** - Fast JavaScript/TypeScript transformer
- **ink-testing-library** - Testing utilities for Ink components
- **@testing-library/react** - React testing utilities

## Writing Tests

### Unit Tests

Unit tests focus on testing individual functions in isolation:

```javascript
import { describe, it, expect } from '@jest/globals';
import { myFunction } from '../../src/utils/myModule.js';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly:

```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync } from 'fs';

describe('File operations', () => {
  beforeEach(() => {
    // Set up test environment
  });

  afterEach(() => {
    // Clean up
  });

  it('should read and write files', () => {
    writeFileSync('test.md', '# Test');
    const content = readFileSync('test.md', 'utf-8');
    expect(content).toBe('# Test');
  });
});
```

### Component Tests

Component tests use ink-testing-library to render and test Ink components:

```javascript
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from '@jest/globals';
import MyComponent from '../../src/components/MyComponent.jsx';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { lastFrame } = render(<MyComponent prop="value" />);
    const output = lastFrame();
    expect(output).toContain('expected text');
  });
});
```

## CI/CD Integration

Tests are automatically run on GitHub Actions for:
- Every push to `main` or `develop` branches
- Every pull request targeting `main` or `develop`

The CI workflow tests on:
- **Operating Systems**: Ubuntu, Windows, macOS
- **Node.js versions**: 18.x, 20.x, 22.x

Code coverage reports are uploaded to Codecov for the Ubuntu + Node 20.x combination.

## Coverage

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov.info` - LCOV format for CI tools
- `coverage/html/` - Human-readable HTML report
- Console summary is displayed after running tests

## Troubleshooting

### "VM Modules is an experimental feature" warning

This is expected and can be safely ignored. We use `NODE_OPTIONS=--experimental-vm-modules` to enable ES module support in Jest.

### Tests failing on Windows

Make sure you have `cross-env` installed. It ensures environment variables work correctly on Windows:
```bash
npm install --save-dev cross-env
```

### Component tests timing out

Ink component tests may occasionally timeout if the component doesn't render immediately. Consider using async utilities or increasing the test timeout:
```javascript
it('should render', async () => {
  // test code
}, 10000); // 10 second timeout
```

## Performance Tests

Performance tests ensure the application remains fast and responsive. They verify:

### Syntax Highlighting Performance
- Individual line highlighting completes in < 5ms
- 1000 lines can be highlighted in < 100ms
- Long lines (1000+ chars) are handled efficiently
- Nested formatting patterns don't cause slowdowns
- Many inline code blocks are processed quickly

### File I/O Performance
- 1MB files read/write in < 100ms
- 10MB files read/write in < 500ms
- Large file operations complete within reasonable time

### Rendering Performance
- Splitting 10,000 lines into array completes in < 50ms
- 100 rapid content updates complete in < 100ms
- Highlighting 800 lines completes in < 200ms

### Memory Efficiency
- Repeated highlighting (10,000 iterations) maintains consistent performance
- No memory leak slowdown over time (< 0.1ms per operation average)

### Performance Thresholds

If performance tests fail, it indicates a potential performance regression. Common causes:
- Inefficient regex patterns in syntax highlighting
- Excessive DOM updates or re-renders
- Memory leaks from unclosed file handles or timers
- Blocking I/O operations

To run only performance tests:
```bash
npm test -- tests/performance
```
