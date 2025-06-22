/**
 * Note Creation Tests
 *
 * Comprehensive tests for note creation functionality including
 * validation, file operations, metadata handling, and error cases.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { Workspace } from '../../src/core/workspace.ts';
import { NoteManager } from '../../src/core/notes.ts';
import { NoteTypeManager } from '../../src/core/note-types.ts';

describe('Note Creation', () => {
  let testWorkspaceRoot: string;
  let workspace: Workspace;
  let noteManager: NoteManager;
  let noteTypeManager: NoteTypeManager;

  beforeEach(async () => {
    // Create a unique temporary directory for each test
    testWorkspaceRoot = path.join(
      tmpdir(),
      `jade-note-test-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await fs.mkdir(testWorkspaceRoot, { recursive: true });

    // Initialize workspace and managers
    workspace = new Workspace(testWorkspaceRoot);
    await workspace.initialize();

    noteManager = new NoteManager(workspace);
    noteTypeManager = new NoteTypeManager(workspace);
  });

  afterEach(async () => {
    // Clean up test workspace
    try {
      await fs.rm(testWorkspaceRoot, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Note Creation', () => {
    test('should create a note in default type', async () => {
      const title = 'My First Note';
      const content = 'This is the content of my first note.';

      const result = await noteManager.createNote('general', title, content);

      assert.strictEqual(result.type, 'general');
      assert.strictEqual(result.title, title);
      assert.strictEqual(result.filename, 'my-first-note.md');
      assert.ok(result.id.includes('general/my-first-note.md'));
      assert.ok(result.created);
      assert.ok(result.path.includes('general/my-first-note.md'));
    });

    test('should create a note with custom note type', async () => {
      // First create a custom note type
      await noteTypeManager.createNoteType('meeting-notes', 'Notes from meetings');

      const title = 'Weekly Standup';
      const content = 'Discussed project progress and blockers.';

      const result = await noteManager.createNote('meeting-notes', title, content);

      assert.strictEqual(result.type, 'meeting-notes');
      assert.strictEqual(result.title, title);
      assert.strictEqual(result.filename, 'weekly-standup.md');
      assert.ok(result.id.includes('meeting-notes/weekly-standup.md'));
    });

    test('should create note file with proper content structure', async () => {
      const title = 'Test Note';
      const content = 'This is test content.';

      await noteManager.createNote('general', title, content);

      // Read the created file
      const filePath = path.join(testWorkspaceRoot, 'general', 'test-note.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Check frontmatter
      assert.ok(fileContent.includes('---'));
      assert.ok(fileContent.includes('title: "Test Note"'));
      assert.ok(fileContent.includes('type: general'));
      assert.ok(fileContent.includes('created:'));
      assert.ok(fileContent.includes('updated:'));
      assert.ok(fileContent.includes('tags: []'));

      // Check content structure
      assert.ok(fileContent.includes('# Test Note'));
      assert.ok(fileContent.includes('This is test content.'));
    });

    test('should handle empty content', async () => {
      const title = 'Empty Note';
      const content = '';

      const result = await noteManager.createNote('general', title, content);

      assert.strictEqual(result.title, title);

      // Verify file was created with just title
      const filePath = path.join(testWorkspaceRoot, 'general', 'empty-note.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      assert.ok(fileContent.includes('# Empty Note'));
    });
  });

  describe('Filename Generation', () => {
    test('should generate safe filenames from titles', async () => {
      const testCases = [
        { title: 'Simple Title', expected: 'simple-title.md' },
        {
          title: 'Title with Special @#$% Characters!',
          expected: 'title-with-special-characters.md'
        },
        { title: 'Multiple   Spaces   Between', expected: 'multiple-spaces-between.md' },
        { title: 'Title-with--hyphens', expected: 'title-with-hyphens.md' },
        { title: 'UPPERCASE TITLE', expected: 'uppercase-title.md' },
        { title: '123 Numeric Title', expected: '123-numeric-title.md' },
        { title: 'Title/with/slashes', expected: 'titlewithslashes.md' }
      ];

      for (const testCase of testCases) {
        const result = await noteManager.createNote('general', testCase.title, 'content');
        assert.strictEqual(
          result.filename,
          testCase.expected,
          `Failed for title: "${testCase.title}"`
        );
      }
    });

    test('should handle very long titles', async () => {
      const longTitle =
        'This is a very long title that exceeds the typical filename length limits and should be truncated appropriately to ensure filesystem compatibility while maintaining readability and uniqueness of the filename generated from the title provided by the user';

      const result = await noteManager.createNote('general', longTitle, 'content');

      assert.ok(result.filename.length <= 204); // 200 chars + '.md'
      assert.ok(result.filename.endsWith('.md'));
    });

    test('should handle empty or invalid titles', async () => {
      const testCases = [
        { title: '', expected: 'untitled.md', noteType: 'general' },
        { title: '   ', expected: 'untitled.md', noteType: 'test-type-1' },
        { title: '!@#$%^&*()', expected: 'untitled.md', noteType: 'test-type-2' },
        { title: '---', expected: 'untitled.md', noteType: 'test-type-3' }
      ];

      // Create additional note types for testing
      for (let i = 1; i <= 3; i++) {
        await noteTypeManager.createNoteType(`test-type-${i}`, `Test type ${i}`);
      }

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        // Add unique content to avoid duplicate file conflicts
        const uniqueContent = `content for test case ${i}: ${testCase.title}`;
        const result = await noteManager.createNote(
          testCase.noteType,
          testCase.title,
          uniqueContent
        );
        assert.strictEqual(
          result.filename,
          testCase.expected,
          `Failed for title: "${testCase.title}"`
        );
      }
    });
  });

  describe('Note Content Formatting', () => {
    test('should format frontmatter correctly', async () => {
      const title = 'Formatted Note';
      const content = 'Content with formatting.';

      await noteManager.createNote('general', title, content);

      const filePath = path.join(testWorkspaceRoot, 'general', 'formatted-note.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');

      const lines = fileContent.split('\n');
      assert.strictEqual(lines[0], '---');
      assert.ok(lines.includes('title: "Formatted Note"'));
      assert.ok(lines.includes('type: general'));
      assert.ok(lines.some(line => line.startsWith('created:')));
      assert.ok(lines.some(line => line.startsWith('updated:')));
      assert.ok(lines.includes('tags: []'));

      // Find the closing frontmatter
      const frontmatterEndIndex = lines.indexOf('---', 1);
      assert.ok(frontmatterEndIndex > 0);
    });

    test('should include title as h1 header', async () => {
      const title = 'Header Test Note';
      const content = 'Content after header.';

      await noteManager.createNote('general', title, content);

      const filePath = path.join(testWorkspaceRoot, 'general', 'header-test-note.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');

      assert.ok(fileContent.includes('# Header Test Note'));
      assert.ok(fileContent.includes('Content after header.'));
    });

    test('should preserve content formatting', async () => {
      const title = 'Formatting Test';
      const content = `This content has:

- Bullet points
- Multiple lines

## Subheading

And **bold** text with *italics*.

\`\`\`javascript
const code = 'block';
\`\`\``;

      await noteManager.createNote('general', title, content);

      const filePath = path.join(testWorkspaceRoot, 'general', 'formatting-test.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');

      assert.ok(fileContent.includes('- Bullet points'));
      assert.ok(fileContent.includes('## Subheading'));
      assert.ok(fileContent.includes('**bold**'));
      assert.ok(fileContent.includes('*italics*'));
      assert.ok(fileContent.includes('```javascript'));
    });
  });

  describe('Error Handling', () => {
    test('should reject creation in non-existent note type', async () => {
      await assert.rejects(
        async () => {
          await noteManager.createNote('non-existent-type', 'Title', 'Content');
        },
        {
          message: /Note type 'non-existent-type' does not exist/
        }
      );
    });

    test('should reject duplicate note titles in same type', async () => {
      const title = 'Duplicate Title';
      const content = 'First note content';

      // Create first note
      await noteManager.createNote('general', title, content);

      // Try to create duplicate
      await assert.rejects(
        async () => {
          await noteManager.createNote('general', title, 'Second note content');
        },
        {
          message: /Note with title 'Duplicate Title' already exists in type 'general'/
        }
      );
    });

    test('should handle filesystem errors gracefully', async () => {
      // Create a note type directory but make it read-only
      const readOnlyType = 'readonly-type';
      await noteTypeManager.createNoteType(readOnlyType, 'Read-only type');

      const readOnlyPath = path.join(testWorkspaceRoot, readOnlyType);
      await fs.chmod(readOnlyPath, 0o444); // Read-only

      await assert.rejects(
        async () => {
          await noteManager.createNote(readOnlyType, 'Test Note', 'Content');
        },
        {
          message: /Failed to create note/
        }
      );

      // Restore permissions for cleanup
      await fs.chmod(readOnlyPath, 0o755);
    });

    test('should handle invalid characters in note type', async () => {
      await assert.rejects(
        async () => {
          await noteManager.createNote('invalid/type', 'Title', 'Content');
        },
        {
          message: /Note type 'invalid\/type' does not exist/
        }
      );
    });
  });

  describe('Search Index Integration', () => {
    test('should update search index when creating note', async () => {
      const title = 'Searchable Note';
      const content = 'This note should be indexed for searching.';

      await noteManager.createNote('general', title, content);

      // Check search index was updated
      const indexPath = path.join(testWorkspaceRoot, '.jade-note', 'search-index.json');
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);

      assert.ok(index.notes);
      assert.ok(Object.keys(index.notes).length > 0);

      // Find our note in the index
      const noteEntries = Object.values(index.notes) as Array<{
        title: string;
        content: string;
        type: string;
      }>;
      const ourNote = noteEntries.find(entry => entry.title === title);

      assert.ok(ourNote);
      assert.ok(ourNote.content.includes('This note should be indexed'));
      assert.strictEqual(ourNote.type, 'general');
    });

    test('should handle search index errors gracefully', async () => {
      // Make search index directory read-only
      const jadeNoteDir = path.join(testWorkspaceRoot, '.jade-note');
      await fs.chmod(jadeNoteDir, 0o444);

      // Note creation should still succeed even if search index fails
      const result = await noteManager.createNote('general', 'Test Note', 'Content');
      assert.ok(result.id);

      // Restore permissions
      await fs.chmod(jadeNoteDir, 0o755);
    });
  });

  describe('Note ID Generation', () => {
    test('should generate consistent note IDs', async () => {
      const result1 = await noteManager.createNote('general', 'Test Note A', 'Content A');
      const result2 = await noteManager.createNote('general', 'Test Note B', 'Content B');

      assert.strictEqual(result1.id, 'general/test-note-a.md');
      assert.strictEqual(result2.id, 'general/test-note-b.md');
      assert.notStrictEqual(result1.id, result2.id);
    });

    test('should include note type in ID', async () => {
      await noteTypeManager.createNoteType('custom-type', 'Custom type');

      const result = await noteManager.createNote(
        'custom-type',
        'Custom Note',
        'Content'
      );

      assert.ok(result.id.startsWith('custom-type/'));
      assert.strictEqual(result.id, 'custom-type/custom-note.md');
    });
  });

  describe('Concurrent Note Creation', () => {
    test('should handle concurrent creation of different notes', async () => {
      const promises = [
        noteManager.createNote('general', 'Note 1', 'Content 1'),
        noteManager.createNote('general', 'Note 2', 'Content 2'),
        noteManager.createNote('general', 'Note 3', 'Content 3')
      ];

      const results = await Promise.all(promises);

      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].title, 'Note 1');
      assert.strictEqual(results[1].title, 'Note 2');
      assert.strictEqual(results[2].title, 'Note 3');

      // Verify all files were created
      const generalDir = path.join(testWorkspaceRoot, 'general');
      const files = await fs.readdir(generalDir);
      const noteFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));
      assert.ok(noteFiles.length >= 3);
    });

    test('should handle sequential duplicate detection reliably', async () => {
      const title = 'Sequential Duplicate Test';

      // Create first note
      const firstNote = await noteManager.createNote('general', title, 'First content');
      assert.ok(firstNote.id);

      // Verify file exists
      const filePath = path.join(
        testWorkspaceRoot,
        'general',
        'sequential-duplicate-test.md'
      );
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      assert.ok(fileExists, 'First note file should exist');

      // Try to create duplicate - should fail
      await assert.rejects(
        async () => {
          await noteManager.createNote('general', title, 'Second content');
        },
        {
          message: /already exists/
        }
      );

      // Verify original file wasn't overwritten
      const fileContent = await fs.readFile(filePath, 'utf-8');
      assert.ok(fileContent.includes('First content'));
      assert.ok(!fileContent.includes('Second content'));
    });
  });

  describe('Metadata Timestamps', () => {
    test('should set created and updated timestamps', async () => {
      const beforeCreation = new Date();

      await noteManager.createNote('general', 'Timestamp Test', 'Content');

      const afterCreation = new Date();

      const filePath = path.join(testWorkspaceRoot, 'general', 'timestamp-test.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Extract timestamps from frontmatter
      const createdMatch = fileContent.match(/created: (.+)/);
      const updatedMatch = fileContent.match(/updated: (.+)/);

      assert.ok(createdMatch);
      assert.ok(updatedMatch);

      const createdTime = new Date(createdMatch[1]);
      const updatedTime = new Date(updatedMatch[1]);

      assert.ok(createdTime >= beforeCreation);
      assert.ok(createdTime <= afterCreation);
      assert.ok(updatedTime >= beforeCreation);
      assert.ok(updatedTime <= afterCreation);

      // Created and updated should be the same for new notes
      assert.strictEqual(createdMatch[1], updatedMatch[1]);
    });

    test('should use ISO format for timestamps', async () => {
      await noteManager.createNote('general', 'ISO Test', 'Content');

      const filePath = path.join(testWorkspaceRoot, 'general', 'iso-test.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');

      const timestampMatch = fileContent.match(/created: (.+)/);
      assert.ok(timestampMatch);

      const timestamp = timestampMatch[1];
      // Check ISO 8601 format (basic check)
      assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp));
    });
  });
});
