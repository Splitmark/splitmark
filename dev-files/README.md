# Development Test Files

This directory contains sample Markdown files used for development and manual testing of Splitmark.

## Files

### Test Files

- **`test.md`** - Simple test file for basic functionality testing
- **`DEMO.md`** - Demo file showcasing basic Markdown features
- **`CTRL_P_DEMO.md`** - File for testing preview toggle (Ctrl+P)

### Feature-Specific Tests

- **`codeblock-test.md`** - Tests code block rendering with syntax highlighting
- **`tables-test.md`** - Tests Markdown table rendering
- **`large-file.md`** - Tests performance with larger files

## Usage

### Manual Testing

```bash
# Test with a specific file
npm run dev dev-files/test.md

# Or directly with tsx
npx tsx bin/index.js dev-files/codeblock-test.md
```

### Testing Different Features

```bash
# Test basic editing
npm run dev dev-files/test.md

# Test code blocks and syntax highlighting
npm run dev dev-files/codeblock-test.md

# Test preview toggle
npm run dev dev-files/CTRL_P_DEMO.md

# Test table rendering
npm run dev dev-files/tables-test.md

# Test performance with larger content
npm run dev dev-files/large-file.md
```

## Adding New Test Files

When adding new development test files:

1. Create the `.md` file in this directory
2. Use descriptive names (e.g., `feature-name-test.md`)
3. Add a comment at the top of the file explaining what it tests
4. Document it in this README

## Note

These files are for **development purposes only** and are not part of the automated test suite. For automated tests, see the `tests/` directory.

Automated tests (Jest) are in:
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/components/` - Component tests
- `tests/performance/` - Performance benchmarks
