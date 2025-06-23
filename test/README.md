# Test Directory Structure

This directory contains all tests for the jade-note project, organized into two main categories:

## Directory Structure

```
test/
├── unit/           # Unit tests - test individual components in isolation
│   └── helpers/    # Shared test utilities and helpers
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
- `basic.test.ts` - Basic import, configuration, and workspace tests
- `links.test.ts` - Link management functionality
- `metadata-schema.test.ts` - Metadata schema parsing and validation
- `note-creation.test.ts` - Note creation logic and validation
- `note-retrieval.test.ts` - Note retrieval and content parsing
- `regex-search.test.ts` - Regex search functionality
- `search-unit.test.ts` - Search manager unit tests
- `template-creation.test.ts` - Template creation and processing logic

**Shared Helpers:**
- `helpers/test-utils.ts` - Common test setup, teardown, and utility functions

## Integration Tests (`test/integration/`)

Integration tests focus on testing complete workflows and system interactions. They:

- Test full end-to-end functionality
- Often spawn MCP server processes
- Use real file system operations with temporary directories
- Test the full stack including MCP protocol communication

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
- Use shared helpers from `./helpers/test-utils.ts` for common operations
- Use consistent test framework patterns (`test`, `describe`, `beforeEach`, `afterEach`)
- Mock external dependencies when possible
- Focus on testing single functions or classes
- Keep tests fast and isolated
- Follow the project's style guide (single quotes, private fields with `#`, etc.)

### Integration Test Guidelines

TODO

## Style Guidelines

Following the project's style guide (`STYLE.md`):

- Use single quotes for strings
- Include semicolons
- Prefer `const` over `let`
- Use private fields (`#private`) over TypeScript `private`
- Handle unused catch bindings appropriately (`catch {}`)
- Use consistent test framework patterns across all test files
- Leverage shared helpers to reduce code duplication

## Shared Test Utilities

### Unit Test Helpers (`helpers/test-utils.ts`)
- `createTestWorkspace()` - Creates a temporary workspace with all managers
- `cleanupTestWorkspace()` - Cleans up temporary directories
- `createTestNotes()` - Creates standard test notes
- `createTestNotesWithMetadata()` - Creates notes with YAML frontmatter
- `createTestNoteTypes()` - Sets up test note types with schemas
- `TestAssertions` - Common assertion helpers
- `TEST_CONSTANTS` - Shared test constants and data

Use these helpers to reduce duplication and ensure consistency across tests.
