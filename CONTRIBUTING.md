# Contributing to Splitmark

Thank you for your interest in contributing to Splitmark! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Environment details** (OS, Node.js version, terminal emulator)
- **Screenshots or terminal output** if applicable
- **Sample Markdown file** that causes the issue (if relevant)

Use the bug report template when creating an issue.

### Suggesting Features

Feature suggestions are welcome! When suggesting a feature:

- **Check existing issues** for similar suggestions
- **Describe the problem** you're trying to solve
- **Describe your proposed solution** with examples
- **Explain why** this feature would be useful to most users
- **Consider alternatives** you've thought about

Use the feature request template when creating an issue.

### Contributing Code

We welcome code contributions! Here are some areas where help is especially appreciated:

- **Bug fixes** for existing issues
- **Performance improvements**
- **Documentation improvements**
- **Test coverage** expansion
- **New features** (please discuss in an issue first)

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- A terminal with ANSI color support

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/splitmark.git
   cd splitmark
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/originalowner/splitmark.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Link for local testing**:
   ```bash
   npm link
   ```

6. **Verify setup**:
   ```bash
   npm test
   splitmark dev-files/test.md
   ```

## Development Workflow

### Creating a Branch

Create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

Branch naming conventions:
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/description` - Documentation updates
- `test/description` - Test additions/changes
- `refactor/description` - Code refactoring
- `perf/description` - Performance improvements

### Making Changes

1. **Make your changes** in your feature branch
2. **Follow coding standards** (see below)
3. **Add/update tests** as needed
4. **Update documentation** if changing functionality
5. **Test thoroughly**:
   ```bash
   npm test                    # Run all tests
   npm run test:watch          # Watch mode during development
   npm run dev dev-files/test.md  # Manual testing
   ```

### Keeping Up to Date

Regularly sync your fork with upstream:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

Rebase your feature branch if needed:

```bash
git checkout feature/your-feature-name
git rebase main
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
npm run test:components     # Component tests
npm run test:performance    # Performance benchmarks

# Watch mode (useful during development)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests

- **Write tests** for all new features and bug fixes
- **Maintain test coverage** - aim for >80%
- **Follow existing test patterns** in the `tests/` directory
- **Use descriptive test names** that explain what is being tested

Test file locations:
- `tests/unit/` - Unit tests for utility functions
- `tests/integration/` - Integration tests for file I/O and workflows
- `tests/components/` - Component rendering tests
- `tests/performance/` - Performance benchmarks

### Performance Tests

If your changes affect performance:
- Run performance tests: `npm run test:performance`
- Ensure performance thresholds are met
- Add new performance tests for new performance-critical code

## Coding Standards

### JavaScript/JSX Style

- **ES6+ syntax** - Use modern JavaScript features
- **ESM imports** - Use `import/export` instead of `require`
- **Functional components** - Use React hooks, not class components
- **Descriptive names** - Use clear, self-documenting variable/function names
- **Comments** - Add comments for complex logic, not obvious code
- **No console logs** - Remove debug console.log statements (use proper error handling)

### Code Organization

- **Small functions** - Keep functions focused and under ~50 lines
- **Single responsibility** - Each function/component should do one thing well
- **DRY principle** - Don't repeat yourself
- **Consistent structure** - Follow existing patterns in the codebase

### React/Ink Specific

- **Use hooks** - `useState`, `useEffect`, `useCallback`, etc.
- **Clean up effects** - Return cleanup functions from `useEffect`
- **Memoization** - Use `useMemo` and `useCallback` for performance
- **PropTypes or JSDoc** - Document component props

### File Naming

- **Components** - PascalCase: `TextBuffer.jsx`, `FileExplorer.jsx`
- **Utilities** - camelCase: `config.js`, `syntaxHighlight.js`
- **Tests** - Match source file with `.test.js`: `config.test.js`

## Commit Guidelines

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `test` - Adding or updating tests
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `style` - Code style changes (formatting, etc.)
- `chore` - Build process or auxiliary tool changes
- `ci` - CI/CD changes

**Examples**:
```
feat(editor): add word wrap support

Add word wrap functionality to the text editor component.
Lines now wrap at word boundaries when exceeding column width.

Closes #123
```

```
fix(selection): correct text duplication on left arrow

Fixed issue where Ctrl+Shift+Left Arrow duplicated text
instead of selecting. Updated selection normalization to
check both line and column positions.

Fixes #456
```

```
test(performance): add file I/O benchmarks

Added performance tests for reading and writing large files
to ensure operations complete within acceptable timeframes.
```

### Commit Best Practices

- **Atomic commits** - Each commit should be a single logical change
- **Clear messages** - Write descriptive commit messages
- **Reference issues** - Link to relevant issues with `Closes #123` or `Fixes #456`
- **Test before committing** - Ensure tests pass before each commit
- **Sign commits** - Consider GPG signing your commits

## Pull Request Process

### Before Submitting

1. **Update from main** - Rebase your branch on the latest main
2. **Run all tests** - Ensure `npm test` passes
3. **Check code style** - Follow coding standards
4. **Update documentation** - If functionality changed
5. **Add/update tests** - For new features or bug fixes
6. **Update CHANGELOG** - Add entry for your changes (see [CHANGELOG.md](CHANGELOG.md))

### Submitting the PR

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues
   - Add screenshots/GIFs for UI changes
   - Mark as draft if work is in progress

3. **Respond to feedback**
   - Address review comments
   - Push additional commits to the same branch
   - Re-request review when ready

### PR Review Process

- **Automated checks** must pass (tests, linting)
- **Code review** by at least one maintainer
- **Discussion** of design decisions if needed
- **Approval** required before merging
- **Squash merge** - PRs are typically squash-merged to main

### After Merge

- **Delete your branch** (both local and remote)
- **Pull latest main** to stay up to date
- **Celebrate!** 🎉 Your contribution is now part of Splitmark!

## Development Tips

### Useful Commands

```bash
# Development with live reload
npm run dev dev-files/test.md

# Test specific features
npm run dev dev-files/codeblock-test.md  # Code blocks
npm run dev dev-files/tables-test.md     # Tables
npm run dev dev-files/large-file.md      # Performance

# Run tests in watch mode while developing
npm run test:watch

# Check specific test suite
npm run test:unit
npm run test:performance
```

### Debugging

- Use `console.error()` for debugging (removed before committing)
- Test in different terminal emulators (iTerm2, Windows Terminal, GNOME Terminal)
- Test with different Markdown files in `dev-files/`
- Use React DevTools for Ink (if applicable)

### Common Pitfalls

- **Stdin raw mode** - Don't forget to set/restore raw mode for input handling
- **Effect cleanup** - Always return cleanup functions from `useEffect`
- **Refs** - Use `useRef` for values that don't trigger re-renders
- **Event handlers** - Use `useCallback` to prevent unnecessary re-renders
- **Large files** - Test with `dev-files/large-file.md` for performance

## Getting Help

- **Documentation** - Check [README.md](README.md), [CONFIG.md](CONFIG.md), [TESTING.md](TESTING.md)
- **Existing issues** - Search for similar questions/problems
- **Ask questions** - Create a new issue with the "question" label
- **Discussions** - Use GitHub Discussions for general questions

## Recognition

Contributors are recognized in:
- GitHub contributors page
- CHANGELOG.md (for significant contributions)
- Release notes

Thank you for contributing to Splitmark! 🚀
