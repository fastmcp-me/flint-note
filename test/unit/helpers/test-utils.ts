/**
 * Shared test utilities for jade-note unit tests
 *
 * Provides common setup/teardown functions and test data creators
 * to reduce duplication across test files.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Workspace } from '../../../src/core/workspace.ts';
import { NoteManager } from '../../../src/core/notes.ts';
import { NoteTypeManager } from '../../../src/core/note-types.ts';
import { SearchManager } from '../../../src/core/search.ts';
import { LinkManager } from '../../../src/core/links.ts';
import { ConfigManager } from '../../../src/utils/config.ts';

/**
 * Test context containing all managers and workspace info
 */
export interface TestContext {
  tempDir: string;
  workspace: Workspace;
  noteManager: NoteManager;
  noteTypeManager: NoteTypeManager;
  searchManager: SearchManager;
  linkManager: LinkManager;
  configManager: ConfigManager;
}

/**
 * Creates a unique temporary directory name for tests
 */
export function createTempDirName(prefix = 'jade-note-test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return join(tmpdir(), `${prefix}-${timestamp}-${random}`);
}

/**
 * Creates and initializes a test workspace with all managers
 */
export async function createTestWorkspace(prefix?: string): Promise<TestContext> {
  const tempDir = createTempDirName(prefix);
  await fs.mkdir(tempDir, { recursive: true });

  const workspace = new Workspace(tempDir);
  await workspace.initialize();

  const noteManager = new NoteManager(workspace);
  const noteTypeManager = new NoteTypeManager(workspace);
  const searchManager = new SearchManager(workspace);
  const linkManager = new LinkManager(workspace, noteManager);
  const configManager = new ConfigManager(tempDir);

  return {
    tempDir,
    workspace,
    noteManager,
    noteTypeManager,
    searchManager,
    linkManager,
    configManager
  };
}

/**
 * Cleans up a test workspace by removing the temporary directory
 */
export async function cleanupTestWorkspace(context: TestContext): Promise<void> {
  try {
    await fs.rm(context.tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Creates standard test notes for testing purposes
 */
export async function createTestNotes(context: TestContext): Promise<void> {
  const { noteManager } = context;

  // Create basic test notes
  await noteManager.createNote(
    'general',
    'Test Note 1',
    'This is the first test note content.'
  );

  await noteManager.createNote(
    'general',
    'Test Note 2',
    'This is the second test note content with some keywords.'
  );

  await noteManager.createNote(
    'general',
    'Sample Document',
    'A sample document for testing search functionality.'
  );
}

/**
 * Creates test notes with metadata for testing metadata functionality
 */
export async function createTestNotesWithMetadata(context: TestContext): Promise<void> {
  const { workspace } = context;

  // Create a note with YAML frontmatter
  const noteWithMetadata = `---
title: "Book Review: Atomic Habits"
author: "James Clear"
rating: 5
status: "completed"
tags: ["productivity", "habits", "self-improvement"]
type: "book-review"
created: "2024-01-15T10:30:00Z"
updated: "2024-01-15T10:30:00Z"
---

# Atomic Habits Review

This book provides excellent insights into habit formation and breaking bad habits.

## Key Takeaways
- Small changes compound over time
- Focus on systems, not goals
- Environment design is crucial
`;

  const notePath = workspace.getNotePath('general', 'atomic-habits-review.md');
  await fs.writeFile(notePath, noteWithMetadata, 'utf8');

  // Create another note with different metadata
  const anotherNoteWithMetadata = `---
title: "Project Planning Notes"
project: "jade-note"
priority: "high"
status: "in-progress"
tags: ["planning", "development"]
type: "project-note"
created: "2024-01-16T09:00:00Z"
updated: "2024-01-16T09:00:00Z"
---

# Project Planning

Planning notes for the jade-note project development.

## Next Steps
- Implement search functionality
- Add metadata validation
- Create comprehensive tests
`;

  const projectNotePath = workspace.getNotePath('general', 'project-planning.md');
  await fs.writeFile(projectNotePath, anotherNoteWithMetadata, 'utf8');
}

/**
 * Creates test note types with descriptions and schemas
 */
export async function createTestNoteTypes(context: TestContext): Promise<void> {
  const { workspace, noteTypeManager } = context;

  // Ensure additional note types exist
  await workspace.ensureNoteType('projects');
  await workspace.ensureNoteType('meetings');
  await workspace.ensureNoteType('book-reviews');

  // Create book-reviews note type with schema
  const bookReviewDescription = `# Book Reviews

## Purpose
Track and review books I've read with structured metadata.

## Agent Instructions
- Always include rating and key takeaways
- Categorize by genre when possible
- Note actionable insights

## Metadata Schema
Expected frontmatter or metadata fields for this note type:
- title: Book title (required, string)
- author: Author name (required, string)
- rating: Personal rating (required, number, min: 1, max: 5)
- status: Reading status (required, string, enum: ["to-read", "reading", "completed"])
- genre: Book genre (optional, string)
- isbn: ISBN number (optional, string, pattern: "^[0-9-]{10,17}$")
- tags: Topic tags (optional, array)
- notes: Personal notes (optional, string)

## Template (Optional)
# {{title}}

**Author:** {{author}}
**Rating:** {{rating}}/5
**Status:** {{status}}

## Summary

## Key Insights

## My Notes
`;

  const bookReviewPath = workspace.getNoteTypePath('book-reviews');
  const descriptionPath = join(bookReviewPath, '.description.md');
  await fs.writeFile(descriptionPath, bookReviewDescription, 'utf8');
}

/**
 * Common assertions for testing core classes
 */
export class TestAssertions {
  /**
   * Assert that all core classes can be imported and instantiated
   */
  static assertCoreClassesImportable(context: TestContext): void {
    const { workspace, noteManager, noteTypeManager, searchManager, linkManager, configManager } = context;

    if (!(workspace instanceof Workspace)) {
      throw new Error('Workspace should be importable and instantiable');
    }
    if (!(noteManager instanceof NoteManager)) {
      throw new Error('NoteManager should be importable and instantiable');
    }
    if (!(noteTypeManager instanceof NoteTypeManager)) {
      throw new Error('NoteTypeManager should be importable and instantiable');
    }
    if (!(searchManager instanceof SearchManager)) {
      throw new Error('SearchManager should be importable and instantiable');
    }
    if (!(linkManager instanceof LinkManager)) {
      throw new Error('LinkManager should be importable and instantiable');
    }
    if (!(configManager instanceof ConfigManager)) {
      throw new Error('ConfigManager should be importable and instantiable');
    }
  }

  /**
   * Assert workspace paths are created correctly
   */
  static assertWorkspacePaths(workspace: Workspace): void {
    const typePath = workspace.getNoteTypePath('general');
    if (!typePath.includes('general')) {
      throw new Error('Should create correct note type path');
    }

    const notePath = workspace.getNotePath('general', 'test.md');
    if (!notePath.includes('general') || !notePath.includes('test.md')) {
      throw new Error('Should create correct note path with filename');
    }
  }

  /**
   * Assert workspace path validation works correctly
   */
  static assertWorkspacePathValidation(workspace: Workspace, tempDir: string): void {
    const validPath = join(tempDir, 'general', 'note.md');
    if (!workspace.isPathInWorkspace(validPath)) {
      throw new Error('Should accept path in workspace');
    }

    if (workspace.isPathInWorkspace('/etc/passwd')) {
      throw new Error('Should reject path outside workspace');
    }
  }
}

/**
 * Test data constants
 */
export const TEST_CONSTANTS = {
  SAMPLE_NOTES: {
    BASIC: {
      title: 'Sample Note',
      content: 'This is a sample note for testing purposes.'
    },
    WITH_METADATA: {
      title: 'Note with Metadata',
      content: `---
title: "Test Note"
tags: ["test", "sample"]
created: "2024-01-01T00:00:00Z"
---

# Test Note

This note has metadata in the frontmatter.`
    }
  },

  NOTE_TYPES: {
    DEFAULT: 'general',
    PROJECT: 'projects',
    MEETING: 'meetings',
    BOOK_REVIEW: 'book-reviews'
  },

  SEARCH_TERMS: {
    SIMPLE: 'test',
    REGEX: '\\b(test|sample)\\b',
    PARTIAL: 'sam'
  }
} as const;
