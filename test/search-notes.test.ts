/**
 * Comprehensive tests for search_notes functionality
 * Tests both the SearchManager class and the MCP server tool integration
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Workspace } from '../src/core/workspace.ts';
import { SearchManager } from '../src/core/search.ts';
import { NoteManager } from '../src/core/notes.ts';
import { NoteTypeManager } from '../src/core/note-types.ts';

interface TestContext {
  tempDir: string;
  workspace: Workspace;
  searchManager: SearchManager;
  noteManager: NoteManager;
  noteTypeManager: NoteTypeManager;
}

describe('Search Notes Functionality', () => {
  let context: TestContext;

  beforeEach(async () => {
    // Create temporary workspace
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jade-note-search-test-'));
    const workspace = new Workspace(tempDir);

    // Initialize managers
    const searchManager = new SearchManager(workspace);
    const noteManager = new NoteManager(workspace);
    const noteTypeManager = new NoteTypeManager(workspace);

    // Create test workspace structure
    await workspace.initialize();
    await workspace.ensureNoteType('general');
    await workspace.ensureNoteType('projects');
    await workspace.ensureNoteType('meetings');

    context = {
      tempDir,
      workspace,
      searchManager,
      noteManager,
      noteTypeManager
    };

    // Create test notes with varied content
    await createTestNotes(context);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(context.tempDir, { recursive: true, force: true });
  });

  describe('Basic Search Operations', () => {
    test('should search notes by content', async () => {
      const results = await context.searchManager.searchNotes('JavaScript', null, 10);

      assert.ok(Array.isArray(results), 'Should return array of results');
      assert.ok(results.length > 0, 'Should find matching notes');

      const jsNote = results.find(
        note =>
          note.title.toLowerCase().includes('javascript') ||
          note.snippet.toLowerCase().includes('javascript')
      );
      assert.ok(jsNote, 'Should find JavaScript-related note');
      assert.ok(jsNote.score > 0, 'Should have positive relevance score');
    });

    test('should search notes by title', async () => {
      const results = await context.searchManager.searchNotes('Tutorial', null, 10);

      assert.ok(results.length > 0, 'Should find notes with Tutorial in title');

      const tutorialNote = results.find(note =>
        note.title.toLowerCase().includes('tutorial')
      );
      assert.ok(tutorialNote, 'Should find tutorial note');
      // Title matches should have higher scores
      assert.ok(tutorialNote.score > 10, 'Title matches should have high scores');
    });

    test('should handle multiple search terms', async () => {
      const results = await context.searchManager.searchNotes(
        'JavaScript programming',
        null,
        10
      );

      assert.ok(results.length > 0, 'Should find notes matching multiple terms');

      const relevantNote = results.find(
        note =>
          note.snippet.toLowerCase().includes('javascript') &&
          note.snippet.toLowerCase().includes('programming')
      );
      assert.ok(relevantNote, 'Should find note containing both terms');
    });

    test('should be case insensitive', async () => {
      const lowerResults = await context.searchManager.searchNotes('javascript', null, 10);
      const upperResults = await context.searchManager.searchNotes('JAVASCRIPT', null, 10);
      const mixedResults = await context.searchManager.searchNotes('JavaScript', null, 10);

      assert.strictEqual(
        lowerResults.length,
        upperResults.length,
        'Case should not affect results count'
      );
      assert.strictEqual(
        lowerResults.length,
        mixedResults.length,
        'Case should not affect results count'
      );
    });

    test('should return empty array for empty query', async () => {
      const results = await context.searchManager.searchNotes('', null, 10);
      assert.strictEqual(results.length, 0, 'Empty query should return no results');
    });

    test('should handle query with no matches', async () => {
      const results = await context.searchManager.searchNotes(
        'nonexistentterm12345',
        null,
        10
      );
      assert.strictEqual(
        results.length,
        0,
        'Query with no matches should return empty array'
      );
    });
  });

  describe('Type Filtering', () => {
    test('should filter by note type', async () => {
      const allResults = await context.searchManager.searchNotes('project', null, 10);
      const projectResults = await context.searchManager.searchNotes(
        'project',
        'projects',
        10
      );

      assert.ok(
        allResults.length >= projectResults.length,
        'Filtered results should be subset'
      );

      // All filtered results should be of the specified type
      for (const result of projectResults) {
        assert.strictEqual(
          result.type,
          'projects',
          'All results should be of projects type'
        );
      }
    });

    test('should return empty array when filtering by non-existent type', async () => {
      const results = await context.searchManager.searchNotes('test', 'nonexistent', 10);
      assert.strictEqual(
        results.length,
        0,
        'Filtering by non-existent type should return empty array'
      );
    });

    test('should handle null type filter', async () => {
      const nullResults = await context.searchManager.searchNotes('test', null, 10);
      const undefinedResults = await context.searchManager.searchNotes(
        'test',
        undefined,
        10
      );

      assert.strictEqual(
        nullResults.length,
        undefinedResults.length,
        'Null and undefined filters should be equivalent'
      );
    });
  });

  describe('Result Limiting', () => {
    test('should respect limit parameter', async () => {
      // Create many notes that match
      for (let i = 0; i < 15; i++) {
        await context.noteManager.createNote(
          'general',
          `Test Note ${i}`,
          `This is test content number ${i} with the keyword searchterm.`
        );
      }

      const results = await context.searchManager.searchNotes('searchterm', null, 5);
      assert.ok(results.length <= 5, 'Should not exceed limit');
    });

    test('should handle zero limit', async () => {
      const results = await context.searchManager.searchNotes('test', null, 0);
      assert.strictEqual(results.length, 0, 'Zero limit should return no results');
    });

    test('should handle negative limit', async () => {
      const results = await context.searchManager.searchNotes('test', null, -1);
      assert.strictEqual(results.length, 0, 'Negative limit should return no results');
    });

    test('should default to reasonable limit when not specified', async () => {
      const results = await context.searchManager.searchNotes('test');
      assert.ok(results.length >= 0, 'Should handle undefined limit gracefully');
    });
  });

  describe('Result Scoring and Ranking', () => {
    test('should rank title matches higher than content matches', async () => {
      // Create notes specifically for scoring test
      await context.noteManager.createNote(
        'general',
        'Python Programming',
        'This note is about various programming languages including Java and C++.'
      );

      await context.noteManager.createNote(
        'general',
        'Various Programming Languages',
        'Python is a great programming language for beginners and experts alike.'
      );

      const results = await context.searchManager.searchNotes('Python', null, 10);

      assert.ok(results.length >= 2, 'Should find both notes');

      // Note with Python in title should score higher
      const titleMatch = results.find(note => note.title.includes('Python'));
      const contentMatch = results.find(
        note =>
          !note.title.includes('Python') && note.snippet.toLowerCase().includes('python')
      );

      if (titleMatch && contentMatch) {
        assert.ok(
          titleMatch.score > contentMatch.score,
          'Title matches should score higher'
        );
      }
    });

    test('should calculate relevance scores correctly', async () => {
      const results = await context.searchManager.searchNotes('programming', null, 10);

      // All results should have positive scores
      for (const result of results) {
        assert.ok(result.score > 0, 'All results should have positive scores');
      }

      // Results should be sorted by score (highest first)
      for (let i = 1; i < results.length; i++) {
        assert.ok(
          results[i - 1].score >= results[i].score,
          'Results should be sorted by score in descending order'
        );
      }
    });

    test('should handle exact word matches vs partial matches', async () => {
      await context.noteManager.createNote(
        'general',
        'Test Note',
        'This note contains the word test as an exact match.'
      );

      await context.noteManager.createNote(
        'general',
        'Testing Note',
        'This note contains testing which is a partial match.'
      );

      const results = await context.searchManager.searchNotes('test', null, 10);

      const exactMatch = results.find(note => note.snippet.includes('word test as'));
      const partialMatch = results.find(note => note.snippet.includes('testing'));

      if (exactMatch && partialMatch) {
        assert.ok(
          exactMatch.score >= partialMatch.score,
          'Exact matches should score at least as high as partial matches'
        );
      }
    });
  });

  describe('Snippet Generation', () => {
    test('should generate relevant snippets', async () => {
      const results = await context.searchManager.searchNotes('JavaScript', null, 10);

      for (const result of results) {
        assert.ok(typeof result.snippet === 'string', 'Snippet should be a string');
        assert.ok(result.snippet.length > 0, 'Snippet should not be empty');
        assert.ok(result.snippet.length <= 250, 'Snippet should be reasonably sized');
      }
    });

    test('should highlight search terms in snippets', async () => {
      const results = await context.searchManager.searchNotes('JavaScript', null, 10);

      const relevantResult = results.find(result =>
        result.snippet.toLowerCase().includes('javascript')
      );

      if (relevantResult) {
        assert.ok(
          relevantResult.snippet.includes('**JavaScript**') ||
            relevantResult.snippet.includes('**javascript**'),
          'Snippet should highlight search terms with markdown bold'
        );
      }
    });

    test('should handle long content in snippets', async () => {
      const longContent =
        'Lorem ipsum '.repeat(100) +
        ' JavaScript programming ' +
        'dolor sit amet '.repeat(100);

      await context.noteManager.createNote('general', 'Long Content Note', longContent);

      const results = await context.searchManager.searchNotes('JavaScript', null, 10);
      const longNote = results.find(note => note.title === 'Long Content Note');

      if (longNote) {
        assert.ok(
          longNote.snippet.length < longContent.length,
          'Snippet should be shorter than full content'
        );
        assert.ok(
          longNote.snippet.includes('JavaScript'),
          'Snippet should contain the search term'
        );
      }
    });
  });

  describe('Search Index Management', () => {
    test('should load empty index when file does not exist', async () => {
      // Delete index file if it exists
      try {
        await fs.unlink(context.workspace.searchIndexPath);
      } catch {
        // File may not exist, that's fine
      }

      const index = await context.searchManager.loadSearchIndex();

      assert.ok(typeof index === 'object', 'Should return index object');
      assert.ok(index.version, 'Should have version');
      assert.ok(index.last_updated, 'Should have last_updated timestamp');
      assert.ok(typeof index.notes === 'object', 'Should have notes object');
      assert.strictEqual(
        Object.keys(index.notes).length,
        0,
        'Should have empty notes index'
      );
    });

    test('should rebuild search index', async () => {
      const result = await context.searchManager.rebuildSearchIndex();

      assert.ok(typeof result === 'object', 'Should return rebuild result');
      assert.ok(
        typeof result.indexedNotes === 'number',
        'Should return count of indexed notes'
      );
      assert.ok(result.indexedNotes > 0, 'Should have indexed some notes');
      assert.ok(result.timestamp, 'Should have timestamp');
    });

    test('should handle corrupted index file', async () => {
      // Write invalid JSON to index file
      await fs.writeFile(
        context.workspace.searchIndexPath,
        'invalid json content',
        'utf-8'
      );

      try {
        await context.searchManager.loadSearchIndex();
        assert.fail('Should throw error for corrupted index');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw Error instance');
      }
    });
  });

  describe('Tag Search Operations', () => {
    test('should search by tags when available', async () => {
      const results = await context.searchManager.searchByTags(['important']);
      assert.ok(Array.isArray(results), 'Should return array of results');

      // If we have results, they should have the correct tag
      for (const result of results) {
        if (result.tags && result.tags.length > 0) {
          assert.ok(
            result.tags.includes('important'),
            'All results should have important tag'
          );
        }
      }
    });

    test('should search by multiple tags with OR logic', async () => {
      const results = await context.searchManager.searchByTags(
        ['important', 'work'],
        false
      );

      assert.ok(Array.isArray(results), 'Should return array of results');

      for (const result of results) {
        if (result.tags && result.tags.length > 0) {
          const hasImportant = result.tags.includes('important');
          const hasWork = result.tags.includes('work');
          assert.ok(
            hasImportant || hasWork,
            'Should have at least one of the specified tags'
          );
        }
      }
    });

    test('should search by multiple tags with AND logic', async () => {
      const results = await context.searchManager.searchByTags(
        ['important', 'work'],
        true
      );

      assert.ok(Array.isArray(results), 'Should return array of results');

      for (const result of results) {
        if (result.tags && result.tags.length > 0) {
          assert.ok(result.tags.includes('important'), 'Should have important tag');
          assert.ok(result.tags.includes('work'), 'Should have work tag');
        }
      }
    });

    test('should get all tags', async () => {
      const tags = await context.searchManager.getAllTags();

      assert.ok(Array.isArray(tags), 'Should return array of tags');

      for (const tagInfo of tags) {
        assert.ok(typeof tagInfo.tag === 'string', 'Tag should be string');
        assert.ok(typeof tagInfo.count === 'number', 'Count should be number');
        assert.ok(tagInfo.count > 0, 'Count should be positive');
      }
    });
  });

  describe('Similar Notes', () => {
    test('should find similar notes', async () => {
      // Use existing notes from createTestNotes
      // Find similar notes to any available note
      const notes = await context.noteManager.listNotes();
      if (notes.length === 0) {
        return; // Skip if no notes available
      }

      const targetNote = notes[0];
      const similar = await context.searchManager.findSimilarNotes(targetNote.id, 5);

      assert.ok(Array.isArray(similar), 'Should return array of similar notes');

      if (similar.length > 0) {
        for (const note of similar) {
          assert.ok(typeof note.similarity === 'number', 'Should have similarity score');
          assert.ok(note.similarity > 0, 'Similarity should be positive');
          assert.ok(note.similarity <= 1, 'Similarity should not exceed 1');
          assert.notStrictEqual(
            note.id,
            targetNote.id,
            'Should not include the target note itself'
          );
        }

        // Results should be sorted by similarity (highest first)
        for (let i = 1; i < similar.length; i++) {
          assert.ok(
            similar[i - 1].similarity >= similar[i].similarity,
            'Results should be sorted by similarity in descending order'
          );
        }
      }
    });

    test('should handle non-existent note for similarity search', async () => {
      try {
        await context.searchManager.findSimilarNotes('nonexistent/note.md', 5);
        assert.fail('Should throw error for non-existent note');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw Error instance');
        assert.ok(
          error.message.includes('not found'),
          'Error should mention note not found'
        );
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      // Make workspace directory read-only to cause errors
      try {
        await fs.chmod(context.tempDir, 0o444);

        try {
          await context.searchManager.rebuildSearchIndex();
          assert.fail('Should throw error when cannot write to directory');
        } catch (error) {
          assert.ok(error instanceof Error, 'Should throw Error instance');
        }
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(context.tempDir, 0o755);
      }
    });

    test('should handle malformed note content', async () => {
      // Create note with malformed frontmatter
      const notePath = path.join(context.tempDir, 'general', 'malformed.md');
      await fs.writeFile(
        notePath,
        '---\ninvalid: yaml: content\n---\nSome content',
        'utf-8'
      );

      // Should not crash when rebuilding index
      const result = await context.searchManager.rebuildSearchIndex();
      assert.ok(result.indexedNotes >= 0, 'Should handle malformed content gracefully');
    });
  });
});

describe('Search Notes MCP Tool Integration', () => {
  let context: TestContext;

  beforeEach(async () => {
    // Set up test context similar to above
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jade-note-tool-test-'));
    const workspace = new Workspace(tempDir);

    const searchManager = new SearchManager(workspace);
    const noteManager = new NoteManager(workspace);
    const noteTypeManager = new NoteTypeManager(workspace);

    await workspace.initialize();
    await workspace.ensureNoteType('general');
    await workspace.ensureNoteType('projects');
    await workspace.ensureNoteType('meetings');

    context = {
      tempDir,
      workspace,
      searchManager,
      noteManager,
      noteTypeManager
    };

    await createTestNotes(context);
  });

  afterEach(async () => {
    await fs.rm(context.tempDir, { recursive: true, force: true });
  });

  test('should handle search with all parameters', async () => {
    const results = await context.searchManager.searchNotes('JavaScript', 'general', 5);

    assert.ok(Array.isArray(results), 'Should return array');
    assert.ok(results.length <= 5, 'Should respect limit');

    for (const result of results) {
      assert.strictEqual(result.type, 'general', 'Should filter by type');
      assert.ok(typeof result.id === 'string', 'Should have string ID');
      assert.ok(typeof result.title === 'string', 'Should have string title');
      assert.ok(typeof result.score === 'number', 'Should have numeric score');
      assert.ok(typeof result.snippet === 'string', 'Should have string snippet');
      assert.ok(
        typeof result.lastUpdated === 'string',
        'Should have lastUpdated timestamp'
      );
      assert.ok(Array.isArray(result.tags), 'Should have tags array');
    }
  });

  test('should handle search with minimal parameters', async () => {
    const results = await context.searchManager.searchNotes('test');

    assert.ok(Array.isArray(results), 'Should return array with minimal parameters');
  });

  test('should validate search parameters', async () => {
    // Test with various invalid parameters
    const emptyResults = await context.searchManager.searchNotes('');
    assert.strictEqual(emptyResults.length, 0, 'Empty query should return empty array');

    const zeroLimitResults = await context.searchManager.searchNotes('test', null, 0);
    assert.strictEqual(
      zeroLimitResults.length,
      0,
      'Zero limit should return empty array'
    );
  });
});

/**
 * Helper function to create test notes with varied content
 */
async function createTestNotes(context: TestContext): Promise<void> {
  // Create notes with different content types for comprehensive testing
  await context.noteManager.createNote(
    'general',
    'JavaScript Tutorial',
    'Learn JavaScript programming with functions, closures, and modern ES6+ features. This tutorial covers async programming and DOM manipulation.'
  );

  await context.noteManager.createNote(
    'general',
    'Python Programming Guide',
    'Python best practices for data science and web development. Covers Django, Flask, pandas, and NumPy libraries.'
  );

  await context.noteManager.createNote(
    'projects',
    'Website Redesign Project',
    'Planning the redesign of our company website using React and TypeScript. Need to implement responsive design and improve performance.'
  );

  await context.noteManager.createNote(
    'meetings',
    'Team Standup Notes',
    'Daily standup meeting notes. Discussed project progress, blockers, and upcoming deadlines. JavaScript refactoring is priority.'
  );

  await context.noteManager.createNote(
    'general',
    'Learning Resources',
    'Collection of programming learning resources including books, tutorials, and online courses for various technologies.'
  );

  await context.noteManager.createNote(
    'projects',
    'Mobile App Development',
    'React Native mobile app project for iOS and Android. Integration with REST APIs and local storage implementation.'
  );

  // Rebuild search index after creating notes
  await context.searchManager.rebuildSearchIndex();
}
