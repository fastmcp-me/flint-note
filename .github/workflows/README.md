# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### `ci.yml` - Main CI Pipeline
**Triggers:** Push/PR to `main` or `develop` branches

This is the primary CI workflow that runs on every push and pull request. It performs:

- **Multi-Node Testing**: Tests against Node.js 18.x, 20.x, and 22.x
- **Type Checking**: Validates TypeScript types with `npm run type-check`
- **Linting**: Runs ESLint with `npm run lint`
- **Unit Tests**: Executes unit tests with `npm run test:unit`
- **Integration Tests**: Runs integration tests with `npm run test:integration`
- **Full Test Suite**: Runs all tests with `npm test`
- **Build Verification**: Compiles TypeScript and verifies build artifacts
- **Format Check**: Ensures code is properly formatted with Prettier

### `cross-platform.yml` - Cross-Platform Testing
**Triggers:** Push/PR to `main`, weekly schedule (Sundays 2 AM UTC)

Tests the application on different operating systems to ensure cross-platform compatibility:

- **Operating Systems**: Windows and macOS
- **Node.js Versions**: 18.x and 20.x
- **Platform-Specific Verification**: Custom checks for executable permissions and file paths
- **CLI Testing**: Validates that the CLI works on each platform

### `release.yml` - Release Pipeline
**Triggers:** Git tags starting with `v` (e.g., `v1.0.0`)

Handles the complete release process when a version tag is pushed:

1. **Release Validation**:
   - Full test suite execution
   - Build verification
   - Package installation testing
   - Version consistency check between `package.json` and git tag

2. **NPM Publishing**:
   - Publishes to NPM registry (requires `NPM_TOKEN` secret)
   - Only runs if validation passes

3. **GitHub Release**:
   - Creates a GitHub release with changelog reference
   - Includes installation instructions

## Secrets Required

For the release workflow to work properly, you need to configure these repository secrets:

- `NPM_TOKEN`: NPM authentication token for publishing packages
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Status Badges

The following badges are available for the README:

- **CI Status**: `[![CI](https://github.com/disnet/flint-note/actions/workflows/ci.yml/badge.svg)](https://github.com/disnet/flint-note/actions/workflows/ci.yml)`
- **Cross-Platform**: `[![Cross-Platform Tests](https://github.com/disnet/flint-note/actions/workflows/cross-platform.yml/badge.svg)](https://github.com/disnet/flint-note/actions/workflows/cross-platform.yml)`

## Local Development

To run the same checks locally that CI runs:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Build
npm run build

# Format check/fix
npm run format
```

## Troubleshooting

### Failed Tests
- Check the Actions tab for detailed logs
- Run tests locally to reproduce issues
- Ensure all dependencies are properly installed

### Failed Releases
- Verify that `package.json` version matches the git tag
- Check that NPM_TOKEN secret is configured and valid
- Ensure all tests pass before tagging

### Cross-Platform Issues
- Test locally on different operating systems
- Check file path separators and executable permissions
- Verify Node.js compatibility across versions