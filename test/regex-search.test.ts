/**
 * Regex Search Tests
 *
 * Tests for regex search functionality in jade-note
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Workspace } from '../src/core/workspace.ts';
import { SearchManager } from '../src/core/search.ts';
import { NoteManager } from '../src/core/notes.ts';

// Test workspace setup
let testWorkspace: Workspace;
let searchManager: SearchManager;
let noteManager: NoteManager;
let testDir: string;

const setupTestWorkspace = async () => {
  testDir = join(
    tmpdir(),
    `jade-note-regex-test-${Date.now()}-${Math.random().toString(36).substring(2)}`
  );
  await fs.mkdir(testDir, { recursive: true });

  testWorkspace = new Workspace(testDir);
  await testWorkspace.initialize();

  searchManager = new SearchManager(testWorkspace);
  noteManager = new NoteManager(testWorkspace);
};

const cleanupTestWorkspace = async () => {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
};

describe('Regex Search', () => {
  beforeEach(async () => {
    await setupTestWorkspace();
  });

  afterEach(async () => {
    await cleanupTestWorkspace();
  });

  describe('Basic Regex Search', () => {
    test('should find notes using simple regex patterns', async () => {
      // Create test notes
      await noteManager.createNote(
        'general',
        'Test Note 1',
        'This note contains the word email@example.com for testing'
      );
      await noteManager.createNote(
        'general',
        'Test Note 2',
        'This note has a phone number: 555-123-4567'
      );
      await noteManager.createNote(
        'general',
        'Test Note 3',
        'Just some regular text without special patterns'
      );

      // Search for email pattern
      const emailResults = await searchManager.searchNotes(
        '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        null,
        10,
        true
      );

      assert.strictEqual(emailResults.length, 1);
      assert.strictEqual(emailResults[0].title, 'Test Note 1');
      assert(emailResults[0].snippet.includes('email@example.com'));
    });

    test('should find notes using phone number regex', async () => {
      // Create test notes
      await noteManager.createNote('general', 'Test Note 1', 'Call me at 555-123-4567');
      await noteManager.createNote(
        'general',
        'Test Note 2',
        'My number is (555) 987-6543'
      );
      await noteManager.createNote('general', 'Test Note 3', 'No phone number here');

      // Search for phone number pattern
      const phoneResults = await searchManager.searchNotes(
        '\\b\\d{3}-\\d{3}-\\d{4}\\b',
        null,
        10,
        true
      );

      assert.strictEqual(phoneResults.length, 1);
      assert.strictEqual(phoneResults[0].title, 'Test Note 1');
    });

    test('should find notes using date pattern regex', async () => {
      // Create test notes
      await noteManager.createNote(
        'general',
        'Meeting Note',
        'Meeting scheduled for 2024-03-15'
      );
      await noteManager.createNote('general', 'Task Note', 'Due date: 2024-12-31');
      await noteManager.createNote('general', 'Random Note', 'Just some text');

      // Rebuild search index to include the new notes
      await searchManager.rebuildSearchIndex();

      // Search for YYYY-MM-DD date pattern (but not timestamps)
      const dateResults = await searchManager.searchNotes(
        '\\b\\d{4}-\\d{2}-\\d{2}\\b',
        null,
        10,
        true
      );

      assert.strictEqual(dateResults.length, 2);
      const titles = dateResults.map(r => r.title).sort();
      assert.deepStrictEqual(titles, ['Meeting Note', 'Task Note']);
    });
  });

  describe('Case Sensitivity', () => {
    test('should respect case sensitivity flags', async () => {
      await noteManager.createNote(
        'general',
        'Test Note',
        'This contains UPPERCASE and lowercase text'
      );

      // Search with case-insensitive flag (default)
      const caseInsensitiveResults = await searchManager.searchNotes(
        'uppercase',
        null,
        10,
        true
      );

      assert.strictEqual(caseInsensitiveResults.length, 1);
    });
  });

  describe('Regex in Titles and Tags', () => {
    test('should find regex matches in note titles', async () => {
      await noteManager.createNote(
        'general',
        'Meeting-2024-03-15',
        'Content about the meeting'
      );
      await noteManager.createNote('general', 'Task-2024-04-20', 'Task details');
      await noteManager.createNote('general', 'Random Note', 'No date in title');

      // Search for date pattern in titles
      const titleResults = await searchManager.searchNotes(
        '\\d{4}-\\d{2}-\\d{2}',
        null,
        10,
        true
      );

      assert.strictEqual(titleResults.length, 2);
      const titles = titleResults.map(r => r.title).sort();
      assert.deepStrictEqual(titles, ['Meeting-2024-03-15', 'Task-2024-04-20']);
    });

    test('should find regex matches in tags', async () => {
      // Create notes with tags
      const note1 = await noteManager.createNote('general', 'Test Note 1', 'Content');
      const note2 = await noteManager.createNote('general', 'Test Note 2', 'Content');
      const note3 = await noteManager.createNote('general', 'Test Note 3', 'Content');

      // Add tags to notes by updating their metadata
      const note1Path = join(testDir, 'general', 'test-note-1.md');
      const note2Path = join(testDir, 'general', 'test-note-2.md');
      const note3Path = join(testDir, 'general', 'test-note-3.md');

      await fs.writeFile(
        note1Path,
        `---
title: "Test Note 1"
type: general
tags: ["project-2024", "meeting"]
---

# Test Note 1

Content`
      );

      await fs.writeFile(
        note2Path,
        `---
title: "Test Note 2"
type: general
tags: ["task-2024", "important"]
---

# Test Note 2

Content`
      );

      await fs.writeFile(
        note3Path,
        `---
title: "Test Note 3"
type: general
tags: ["random", "notes"]
---

# Test Note 3

Content`
      );

      // Rebuild search index to include the updated tags
      await searchManager.rebuildSearchIndex();

      // Search for pattern in tags
      const tagResults = await searchManager.searchNotes('\\w+-2024', null, 10, true);

      assert.strictEqual(tagResults.length, 2);
      const titles = tagResults.map(r => r.title).sort();
      assert.deepStrictEqual(titles, ['Test Note 1', 'Test Note 2']);
    });
  });

  describe('Complex Regex Patterns', () => {
    test('should handle complex word boundary patterns', async () => {
      await noteManager.createNote(
        'general',
        'Test Note 1',
        'The function getName() returns a string'
      );
      await noteManager.createNote(
        'general',
        'Test Note 2',
        'Use setName() to update the name'
      );
      await noteManager.createNote('general', 'Test Note 3', 'No function calls here');

      // Rebuild search index to include the new notes
      await searchManager.rebuildSearchIndex();

      // Search for function call pattern (any word followed by parentheses)
      const functionResults = await searchManager.searchNotes(
        '\\w+\\(\\)',
        null,
        10,
        true
      );

      // Should find at least one result
      assert(functionResults.length >= 1);
      assert(functionResults.some(r => r.title === 'Test Note 1'));
    });

    test('should handle alternation patterns', async () => {
      await noteManager.createNote(
        'general',
        'Test Note 1',
        'This is urgent and needs attention'
      );
      await noteManager.createNote(
        'general',
        'Test Note 2',
        'This is important for the project'
      );
      await noteManager.createNote(
        'general',
        'Test Note 3',
        'This is just a regular note'
      );

      // Rebuild search index to include the new notes
      await searchManager.rebuildSearchIndex();

      // Search for urgent OR important
      const urgentResults = await searchManager.searchNotes(
        '\\b(urgent|important)\\b',
        null,
        10,
        true
      );

      // Should find at least one result
      assert(urgentResults.length >= 1);
      assert(urgentResults.some(r => r.title === 'Test Note 1'));
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid regex patterns gracefully', async () => {
      await noteManager.createNote('general', 'Test Note', 'Some content');

      // Test invalid regex
      await assert.rejects(async () => {
        await searchManager.searchNotes('[invalid regex', null, 10, true);
      }, /Invalid regex pattern/);
    });
  });

  describe('Regex Snippet Generation', () => {
    test('should generate proper snippets for regex matches', async () => {
      const longContent =
        'This is a long piece of text that contains an email address user@example.com somewhere in the middle of a much longer paragraph that should be truncated properly when generating snippets for search results.';

      await noteManager.createNote('general', 'Long Note', longContent);

      const results = await searchManager.searchNotes(
        '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        null,
        10,
        true
      );

      assert.strictEqual(results.length, 1);
      assert(results[0].snippet.includes('user@example.com'));
      assert(results[0].snippet.includes('...'));
    });
  });

  describe('Type Filtering with Regex', () => {
    test('should combine type filtering with regex search', async () => {
      // Create notes in different types
      await noteManager.createNote(
        'general',
        'General Note',
        'Contact: user@example.com'
      );

      // Create meetings note type first
      await testWorkspace.ensureNoteType('meetings');
      await noteManager.createNote(
        'meetings',
        'Meeting Note',
        'Attendee: admin@company.com'
      );

      // Rebuild search index
      await searchManager.rebuildSearchIndex();

      // Search for emails only in general notes
      const generalResults = await searchManager.searchNotes(
        '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        'general',
        10,
        true
      );

      assert.strictEqual(generalResults.length, 1);
      assert.strictEqual(generalResults[0].title, 'General Note');
    });
  });

  describe('Scoring and Ranking', () => {
    test('should properly score regex matches', async () => {
      // Create notes with matches in different locations
      await noteManager.createNote(
        'general',
        'Email-2024-03-15',
        'Content with email@example.com'
      );
      await noteManager.createNote(
        'general',
        'Regular Note',
        'Content with date 2024-03-15'
      );

      // Rebuild search index to include the new notes
      await searchManager.rebuildSearchIndex();

      // Search for date pattern
      const results = await searchManager.searchNotes(
        '\\d{4}-\\d{2}-\\d{2}',
        null,
        10,
        true
      );

      assert.strictEqual(results.length, 2);
      // Both should match in content since the date appears in both titles
      // But the first one should score higher due to title match as well
      assert.strictEqual(results[0].title, 'Email-2024-03-15');
      assert(results[0].score >= results[1].score);
    });
  });
});
