# Splitmark Testing Summary

## Test Coverage Overview

Splitmark has a comprehensive test suite with **45 tests** across **4 test suites**:

### Test Suites Breakdown

| Suite | Tests | Focus Area |
|-------|-------|------------|
| **Unit Tests** | 8 | Configuration utilities (loading, saving, path resolution) |
| **Integration Tests** | 15 | File I/O operations and config persistence |
| **Component Tests** | 4 | File explorer rendering and behavior |
| **Performance Tests** | 18 | Syntax highlighting, file I/O, and rendering performance |

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test suite
npm test -- tests/unit
npm test -- tests/integration
npm test -- tests/components
npm test -- tests/performance
```

## Test Results

All tests pass successfully:

```
Test Suites: 4 passed, 4 total
Tests:       45 passed, 45 total
```

### Unit Tests (8 tests)
- ✅ Config path resolution
- ✅ Default config loading
- ✅ Custom config merging
- ✅ Simple filename resolution to default location
- ✅ Absolute path preservation
- ✅ Windows path handling
- ✅ Relative path handling (`./ and ../`)
- ✅ Directory auto-creation

### Integration Tests (15 tests)
- ✅ New markdown file creation in default location
- ✅ Nested directory creation
- ✅ File content updates
- ✅ Empty file creation
- ✅ Special characters in filenames
- ✅ Custom config save and load
- ✅ Malformed config graceful handling
- ✅ Partial config merging
- ✅ Relative path resolution
- ✅ Absolute path resolution
- ✅ Simple filename appending
- ✅ Nested path handling

### Component Tests (4 tests)
- ✅ File explorer component rendering
- ✅ Current path display
- ✅ Help text display
- ✅ Item count display

### Performance Tests (18 tests)

#### Syntax Highlighting Performance (6 tests)
- ✅ Simple line highlighting < 5ms
- ✅ Complex line with multiple formats < 5ms
- ✅ 1000 lines highlighting < 100ms
- ✅ Very long lines (1000+ chars) < 10ms
- ✅ Nested formatting patterns < 5ms
- ✅ Many inline code blocks < 5ms

#### File I/O Performance (4 tests)
- ✅ 1MB file read < 100ms
- ✅ 1MB file write < 100ms
- ✅ 10MB file read < 500ms
- ✅ 10MB file write < 500ms

#### Rendering Performance (3 tests)
- ✅ Split 10,000 lines < 50ms
- ✅ 100 rapid content updates < 100ms
- ✅ Highlight 800 lines < 200ms

#### Memory Efficiency (2 tests)
- ✅ 10,000 repeated highlights with consistent performance
- ✅ Alternating line types without slowdown

#### Edge Cases Performance (3 tests)
- ✅ 10,000 empty lines < 50ms
- ✅ 10,000 plain text lines < 100ms
- ✅ 1000 lines with special characters < 50ms

## Performance Thresholds

The test suite enforces performance thresholds to catch regressions:

| Operation | Threshold | Purpose |
|-----------|-----------|---------|
| Single line highlight | < 5ms | Ensure responsive typing |
| 1000 line highlights | < 100ms | Ensure smooth scrolling |
| 1MB file read/write | < 100ms | Quick file operations |
| 10MB file read/write | < 500ms | Handle large files |
| 10,000 line split | < 50ms | Fast text processing |
| Repeated operations | < 0.1ms avg | No memory leaks |

## Continuous Integration

Tests run automatically on GitHub Actions for:
- **Every push** to `main` or `develop` branches
- **Every pull request** targeting `main` or `develop`

### Test Matrix

Tests run on multiple environments:

| OS | Node.js Versions |
|----|------------------|
| Ubuntu | 18.x, 20.x, 22.x |
| Windows | 18.x, 20.x, 22.x |
| macOS | 18.x, 20.x, 22.x |

**Total CI test combinations**: 9 (3 OS × 3 Node versions)

## Code Coverage

Coverage reports are generated and uploaded to Codecov for:
- Function coverage
- Line coverage
- Branch coverage
- Statement coverage

Coverage files:
- `coverage/lcov.info` - LCOV format for CI
- `coverage/html/` - HTML report for local viewing
- Console summary after test run

## Test Framework

- **Jest 30.x** - Testing framework
- **@swc/jest** - Fast ES module transformer
- **ink-testing-library** - Ink component testing
- **@testing-library/react** - React utilities
- **cross-env** - Cross-platform environment variables

## Known Test Behaviors

### Expected Console Errors

The test "should handle malformed config file gracefully" intentionally produces console errors to verify error handling. This is expected behavior:

```
console.error
  Warning: Could not load config from ~/.splitmarkrc: ...
console.error
  Using default configuration
```

### VM Modules Warning

This warning is expected and safe to ignore:
```
ExperimentalWarning: VM Modules is an experimental feature
```

It appears because Jest uses Node's experimental VM modules for ES module support.

## Writing New Tests

See [tests/README.md](tests/README.md) for detailed instructions on:
- Writing unit tests
- Writing integration tests
- Writing component tests
- Writing performance tests
- Testing best practices

## Test Maintenance

When adding new features:
1. Write tests for new functionality
2. Run `npm test` to ensure all tests pass
3. Check `npm run test:coverage` for coverage gaps
4. Add performance tests for performance-critical code
5. Update this document if adding new test categories

## Performance Regression Detection

If performance tests fail:
1. Check recent code changes in the affected area
2. Profile the failing operation
3. Look for:
   - Inefficient regex patterns
   - Unnecessary re-renders
   - Blocking I/O operations
   - Memory leaks (unclosed handles/timers)
4. Compare performance before and after changes

## Success Criteria

✅ All 45 tests passing
✅ Performance thresholds met
✅ No test warnings (except expected VM modules)
✅ Coverage reports generated
✅ CI pipeline green on all platforms
