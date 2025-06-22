# Test Directory Structure

This directory contains all tests for the jade-note project, organized into two main categories:

## Directory Structure

```
test/
├── unit/           # Unit tests - test individual components in isolation
├── integration/    # Integration tests - test end-to-end workflows
└── README.md       # This file
```

## Unit Tests (`test/unit/`)

Unit tests focus on testing individual classes and functions in isolation. They:

- Test single components without external dependencies
- Use mocked or minimal file system operations
- Run quickly and don't require full system setup
- Import and test classes directly from `../../src/`

**Files:**
- `basic.test.ts` - Basic import and structure tests
- `links.test.ts` - Link management functionality
- `metadata-schema.test.ts` - Metadata schema parsing and validation
- `note-creation.test.ts` - Note creation logic
- `note-retrieval.test.ts` - Note retrieval functionality
- `regex-search.test.ts` - Regex search functionality
- `search-unit.test.ts` - Search manager unit tests
- `template-creation.test.ts` - Template creation logic

## Integration Tests (`test/integration/`)

Integration tests focus on testing complete workflows and system interactions. They:

- Test full end-to-end functionality
- Often spawn MCP server processes
- Use real file system operations with temporary directories
- Test the full stack including MCP protocol communication

**Files:**
- `integration.test.ts` - Main MCP server integration tests
- `link-debug.test.ts` - Link debugging and troubleshooting
- `link-notes-integration.test.ts` - Note linking integration
- `metadata-integration.test.ts` - Metadata system integration
- `note-type-management.test.ts` - Note type management via MCP
- `search-index-update.test.ts` - Search index update integration
- `search-integration.test.ts` - Search functionality via MCP
- `search-notes.test.ts` - Comprehensive search tests

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests (fast)
npm run test:unit

# Run only integration tests (slower)
npm run test:integration

# Run tests with specific pattern
node --test test/unit/search-*.test.ts
```

## Writing Tests

### Unit Test Guidelines

- Import modules directly from `../../src/`
- Use minimal setup/teardown
- Mock external dependencies when possible
- Focus on testing single functions or classes
- Keep tests fast and isolated

### Integration Test Guidelines

- Use temporary directories for file operations
- Clean up resources in `afterEach`/`after` hooks
- Test complete user workflows
- Include MCP protocol communication when relevant
- Test error conditions and edge cases

## Style Guidelines

Following the project's style guide (`STYLE.md`):

- Use single quotes for strings
- Include semicolons
- Prefer `const` over `let`
- Use private fields (`#private`) over TypeScript `private`
- Handle unused catch bindings appropriately (`catch {}`)