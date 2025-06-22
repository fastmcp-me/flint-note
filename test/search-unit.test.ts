/**
 * Unit tests for search functionality
 * Tests the SearchManager class directly without MCP server integration
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

describe('Search Unit Tests', () => {
  let context: TestContext;

  beforeEach(async () => {
    // Create temporary workspace
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'jade-note-search-unit-test-')
    );
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
    await workspace.ensureNoteType('research');

    context = {
      tempDir,
      workspace,
      searchManager,
      noteManager,
      noteTypeManager
    };

    // Create comprehensive test data
    await createTestNotes(context);

    // Build initial search index
    await context.searchManager.rebuildSearchIndex();
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
      assert.ok(typeof jsNote.snippet === 'string', 'Should have snippet');
      assert.ok(jsNote.snippet.length > 0, 'Should have non-empty snippet');
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

      if (relevantNote) {
        assert.ok(
          relevantNote.score > 0,
          'Multi-term matches should have positive scores'
        );
      }
    });

    test('should be case insensitive', async () => {
      const queries = ['javascript', 'JAVASCRIPT', 'JavaScript'];
      const allResults = [];

      for (const query of queries) {
        const results = await context.searchManager.searchNotes(query, null, 5);
        allResults.push(results);
      }

      // All queries should return the same number of results
      assert.strictEqual(allResults[0].length, allResults[1].length);
      assert.strictEqual(allResults[1].length, allResults[2].length);

      if (allResults[0].length > 0) {
        assert.strictEqual(allResults[0][0].id, allResults[1][0].id);
        assert.strictEqual(allResults[0][0].id, allResults[2][0].id);
      }
    });

    test('should return all notes for empty query', async () => {
      const results = await context.searchManager.searchNotes('', null, 10);
      assert.ok(Array.isArray(results));
      assert.ok(results.length > 0, 'Empty query should return all notes');
      // Results should be sorted by last updated (most recent first)
      for (let i = 0; i < results.length - 1; i++) {
        const current = new Date(results[i].lastUpdated).getTime();
        const next = new Date(results[i + 1].lastUpdated).getTime();
        assert.ok(current >= next, 'Results should be sorted by last updated descending');
      }
    });

    test('should handle query with no matches', async () => {
      const results = await context.searchManager.searchNotes(
        'nonexistentterm12345',
        null,
        10
      );

      assert.ok(Array.isArray(results));
      assert.strictEqual(
        results.length,
        0,
        'Should return empty array for non-matching query'
      );
    });
  });

  describe('Type Filtering', () => {
    test('should filter by note type', async () => {
      const results = await context.searchManager.searchNotes('project', 'projects', 10);

      assert.ok(Array.isArray(results));

      // All results should be from 'projects' type
      for (const result of results) {
        assert.strictEqual(result.type, 'projects');
      }
    });

    test('should return empty array when filtering by non-existent type', async () => {
      const results = await context.searchManager.searchNotes(
        'test',
        'nonexistenttype',
        10
      );

      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 0);
    });

    test('should handle null type filter', async () => {
      const results = await context.searchManager.searchNotes('test', null, 10);
      const filteredResults = await context.searchManager.searchNotes(
        'test',
        'general',
        10
      );

      assert.ok(Array.isArray(results));
      assert.ok(Array.isArray(filteredResults));
      // Unfiltered should have >= filtered results
      assert.ok(results.length >= filteredResults.length);
    });
  });

  describe('Result Limiting', () => {
    test('should respect limit parameter', async () => {
      // Create multiple notes with same search term
      await context.noteManager.createNote(
        'general',
        'Test Note 1',
        'This contains searchterm in the content'
      );

      const results = await context.searchManager.searchNotes('searchterm', null, 2);

      assert.ok(Array.isArray(results));
      assert.ok(results.length <= 2, 'Should respect limit parameter');
    });

    test('should handle zero limit', async () => {
      const results = await context.searchManager.searchNotes('test', null, 0);
      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 0);
    });

    test('should handle negative limit', async () => {
      const results = await context.searchManager.searchNotes('test', null, -1);
      assert.ok(Array.isArray(results));
      // Should handle gracefully (implementation-specific behavior)
    });

    test('should default to reasonable limit when not specified', async () => {
      const results = await context.searchManager.searchNotes('test');
      assert.ok(Array.isArray(results));
      // Should not return unlimited results
    });
  });

  describe('Result Scoring and Ranking', () => {
    test('should rank title matches higher than content matches', async () => {
      // Create notes with Python in different positions
      await context.noteManager.createNote(
        'general',
        'Python Programming Guide',
        'This is a guide about software development best practices.'
      );

      await context.noteManager.createNote(
        'general',
        'Development Best Practices',
        'This guide covers various topics including Python programming languages.'
      );

      // Rebuild index to include new notes
      await context.searchManager.rebuildSearchIndex();

      const results = await context.searchManager.searchNotes('Python', null, 10);

      assert.ok(results.length >= 2, 'Should find both notes');

      const titleMatch = results.find(note =>
        note.title.toLowerCase().includes('python')
      );
      const contentMatch = results.find(
        note =>
          !note.title.toLowerCase().includes('python') &&
          note.snippet.toLowerCase().includes('python')
      );

      if (titleMatch && contentMatch) {
        assert.ok(
          titleMatch.score > contentMatch.score,
          'Title matches should have higher scores than content matches'
        );
      }
    });

    test('should calculate relevance scores correctly', async () => {
      const results = await context.searchManager.searchNotes('programming', null, 10);

      assert.ok(results.length > 0, 'Should find programming-related notes');

      // Results should be sorted by score (highest first)
      for (let i = 0; i < results.length - 1; i++) {
        assert.ok(
          results[i].score >= results[i + 1].score,
          'Results should be sorted by relevance score'
        );
      }

      // All scores should be positive
      for (const result of results) {
        assert.ok(result.score > 0, 'All scores should be positive');
      }
    });

    test('should handle exact word matches vs partial matches', async () => {
      await context.noteManager.createNote(
        'general',
        'Test Document',
        'This is a test document for exact word matching.'
      );

      await context.noteManager.createNote(
        'general',
        'Testing Framework',
        'This document covers testing frameworks and methodologies.'
      );

      // Rebuild index to include new notes
      await context.searchManager.rebuildSearchIndex();

      const results = await context.searchManager.searchNotes('test', null, 10);

      assert.ok(results.length > 0, 'Should find test-related notes');

      // Results should be sorted by relevance, with exact matches scoring higher
      if (results.length > 1) {
        assert.ok(results[0].score >= results[1].score);
      }
    });
  });

  describe('Snippet Generation', () => {
    test('should generate relevant snippets', async () => {
      const results = await context.searchManager.searchNotes('JavaScript', null, 5);

      assert.ok(results.length > 0, 'Should find JavaScript notes');

      for (const result of results) {
        assert.ok(typeof result.snippet === 'string', 'Snippet should be string');
        assert.ok(result.snippet.length > 0, 'Snippet should not be empty');
        assert.ok(result.snippet.length <= 250, 'Snippet should be reasonable length');
      }
    });

    test('should highlight search terms in snippets', async () => {
      const results = await context.searchManager.searchNotes('JavaScript', null, 5);

      for (const result of results) {
        if (result.snippet.toLowerCase().includes('javascript')) {
          assert.ok(
            result.snippet.includes('**'),
            'Should highlight search terms with markdown bold'
          );
        }
      }
    });

    test('should handle long content in snippets', async () => {
      const longContent =
        'This is a very long document. '.repeat(100) +
        'JavaScript is mentioned here in the middle of a very long document. ' +
        'More content follows. '.repeat(50);

      await context.noteManager.createNote('general', 'Long Document Test', longContent);

      // Rebuild index to include new note
      await context.searchManager.rebuildSearchIndex();

      const results = await context.searchManager.searchNotes('JavaScript', null, 5);

      const longNote = results.find(note => note.title === 'Long Document Test');
      assert.ok(longNote, 'Should find the long document');
      assert.ok(longNote.snippet.length <= 250, 'Snippet should be truncated');
      assert.ok(
        longNote.snippet.toLowerCase().includes('javascript'),
        'Snippet should include the search term'
      );
    });
  });

  describe('Search Index Management', () => {
    test('should load empty index when file does not exist', async () => {
      // Create a new workspace without building index
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jade-note-empty-index-'));
      const workspace = new Workspace(tempDir);
      await workspace.initialize();

      const searchManager = new SearchManager(workspace);
      const index = await searchManager.loadSearchIndex();

      assert.ok(typeof index === 'object', 'Should return index object');
      assert.ok(typeof index.notes === 'object', 'Should have notes property');
      assert.strictEqual(Object.keys(index.notes).length, 0, 'Should be empty');

      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    test('should rebuild search index', async () => {
      const result = await context.searchManager.rebuildSearchIndex();

      assert.ok(typeof result === 'object', 'Should return rebuild result');
      assert.ok(
        typeof result.indexedNotes === 'number',
        'Should report indexed note count'
      );
      assert.ok(result.indexedNotes > 0, 'Should have indexed some notes');
      assert.ok(typeof result.timestamp === 'string', 'Should have timestamp');
    });

    test('should handle corrupted index file', async () => {
      // Write corrupted index file
      const indexPath = context.workspace.searchIndexPath;
      await fs.writeFile(indexPath, 'invalid json content', 'utf-8');

      try {
        await context.searchManager.loadSearchIndex();
        assert.fail('Should throw error for corrupted index');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('JSON') || error.message.includes('parse'));
      }
    });
  });

  describe('Tag Search Operations', () => {
    test('should search by tags when available', async () => {
      // Create note with tags
      const noteContent = `---
title: "Tagged Note"
tags: ["javascript", "tutorial"]
---

# Tagged Note

This is a note with tags.`;

      await fs.writeFile(
        path.join(context.tempDir, 'general', 'tagged-note.md'),
        noteContent
      );

      // Rebuild index to include tagged note
      await context.searchManager.rebuildSearchIndex();

      const results = await context.searchManager.searchByTags(['javascript'], false);

      assert.ok(Array.isArray(results), 'Should return array');
      const taggedNote = results.find(note => note.title === 'Tagged Note');
      assert.ok(taggedNote, 'Should find tagged note');
      assert.ok(taggedNote.tags.includes('javascript'), 'Should include javascript tag');
    });

    test('should search by multiple tags with OR logic', async () => {
      const results = await context.searchManager.searchByTags(
        ['javascript', 'python'],
        false // OR logic
      );

      assert.ok(Array.isArray(results), 'Should return array');
      // Should find notes that have either javascript OR python tags
    });

    test('should search by multiple tags with AND logic', async () => {
      const results = await context.searchManager.searchByTags(
        ['javascript', 'tutorial'],
        true // AND logic
      );

      assert.ok(Array.isArray(results), 'Should return array');
      // Should only find notes that have both javascript AND tutorial tags
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
      // Create notes with similar content
      await context.noteManager.createNote(
        'general',
        'JavaScript Basics',
        'Learning JavaScript fundamentals including variables, functions, and objects.'
      );

      await context.noteManager.createNote(
        'general',
        'JavaScript Advanced',
        'Advanced JavaScript concepts like closures, prototypes, and async programming.'
      );

      // Rebuild index
      await context.searchManager.rebuildSearchIndex();

      const results = await context.searchManager.findSimilarNotes(
        'general/javascript-basics.md',
        5
      );

      assert.ok(Array.isArray(results), 'Should return array');

      for (const result of results) {
        assert.ok(typeof result.similarity === 'number', 'Should have similarity score');
        assert.ok(
          result.similarity >= 0 && result.similarity <= 1,
          'Similarity should be between 0 and 1'
        );
        assert.ok(typeof result.id === 'string', 'Should have note ID');
      }
    });

    test('should handle non-existent note for similarity search', async () => {
      try {
        await context.searchManager.findSimilarNotes('nonexistent/note.md', 5);
        assert.fail('Should throw error for non-existent note');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('not found'));
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      // Create a search manager with an invalid workspace
      const invalidPath = path.join(os.tmpdir(), 'nonexistent-' + Date.now());
      const invalidWorkspace = new Workspace(invalidPath);
      const invalidSearchManager = new SearchManager(invalidWorkspace);

      try {
        await invalidSearchManager.searchNotes('test', null, 10);
        // Should handle gracefully, either returning empty results or throwing informative error
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(typeof error.message === 'string');
      }
    });

    test('should handle malformed note content', async () => {
      // Create note with malformed frontmatter
      const malformedContent = `---
title: "Test"
tags: [invalid yaml structure
---

# Test Note

Content here.`;

      await fs.writeFile(
        path.join(context.tempDir, 'general', 'malformed.md'),
        malformedContent
      );

      // Should handle gracefully during index rebuild
      const result = await context.searchManager.rebuildSearchIndex();
      assert.ok(typeof result.indexedNotes === 'number');
      // Should still index other valid notes
    });
  });

  describe('Content Parsing and Extraction', () => {
    test('should extract title from frontmatter', async () => {
      const noteContent = `---
title: "Custom Title"
---

# Header in Content

This note has a title in frontmatter.`;

      await fs.writeFile(
        path.join(context.tempDir, 'general', 'custom-title.md'),
        noteContent
      );

      await context.searchManager.rebuildSearchIndex();
      const results = await context.searchManager.searchNotes('Custom Title', null, 10);

      const customNote = results.find(note => note.title === 'Custom Title');
      assert.ok(customNote, 'Should find note by frontmatter title');
    });

    test('should extract title from filename when no frontmatter', async () => {
      const noteContent = `# Some Header

This note has no frontmatter title.`;

      await fs.writeFile(
        path.join(context.tempDir, 'general', 'filename-title.md'),
        noteContent
      );

      await context.searchManager.rebuildSearchIndex();
      const results = await context.searchManager.searchNotes('Filename Title', null, 10);

      assert.ok(results.length > 0, 'Should find note by filename-derived title');
    });

    test('should handle notes with complex frontmatter', async () => {
      const noteContent = `---
title: "Complex Note"
author: "Test Author"
created: "2024-01-01"
tags: ["test", "complex"]
metadata:
  category: "example"
  priority: high
---

# Complex Note

This note has complex frontmatter.`;

      await fs.writeFile(
        path.join(context.tempDir, 'general', 'complex.md'),
        noteContent
      );

      await context.searchManager.rebuildSearchIndex();
      const results = await context.searchManager.searchNotes('Complex Note', null, 10);

      const complexNote = results.find(note => note.title === 'Complex Note');
      assert.ok(complexNote, 'Should handle complex frontmatter');
      assert.ok(complexNote.tags.includes('test'), 'Should extract tags');
      assert.ok(complexNote.tags.includes('complex'), 'Should extract all tags');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large numbers of notes efficiently', async () => {
      // Create many notes
      const notePromises = [];
      for (let i = 0; i < 50; i++) {
        notePromises.push(
          context.noteManager.createNote(
            'general',
            `Performance Test Note ${i}`,
            `This is test note number ${i} with some searchable content about testing.`
          )
        );
      }
      await Promise.all(notePromises);

      const startTime = Date.now();
      await context.searchManager.rebuildSearchIndex();
      const indexTime = Date.now() - startTime;

      const searchStart = Date.now();
      const results = await context.searchManager.searchNotes('testing', null, 20);
      const searchTime = Date.now() - searchStart;

      assert.ok(indexTime < 5000, 'Index rebuild should complete within 5 seconds');
      assert.ok(searchTime < 1000, 'Search should complete within 1 second');
      assert.ok(results.length > 0, 'Should find test notes');
    });

    test('should handle special characters in search queries', async () => {
      const queries = [
        'test & development',
        'note.js',
        'search(query)',
        'file-name',
        'user@example.com',
        '$variable',
        'c++',
        'regular*expression'
      ];

      for (const query of queries) {
        try {
          const results = await context.searchManager.searchNotes(query, null, 5);
          assert.ok(Array.isArray(results), `Should handle query: ${query}`);
        } catch {
          assert.fail(`Should not throw error for query: ${query}`);
        }
      }
    });

    test('should handle very long search queries', async () => {
      const longQuery = 'test '.repeat(100);

      try {
        const results = await context.searchManager.searchNotes(longQuery, null, 5);
        assert.ok(Array.isArray(results), 'Should handle very long queries');
      } catch {
        assert.fail('Should not throw error for long queries');
      }
    });
  });
});

/**
 * Create test notes for comprehensive search testing
 */
async function createTestNotes(context: TestContext): Promise<void> {
  // General notes
  await context.noteManager.createNote(
    'general',
    'JavaScript Tutorial',
    'Learning about JavaScript functions, closures, and async programming. This comprehensive guide covers modern JavaScript development patterns and best practices.'
  );

  await context.noteManager.createNote(
    'general',
    'Python Guide',
    'Python programming best practices and patterns. Understanding list comprehensions, decorators, and context managers for effective development.'
  );

  await context.noteManager.createNote(
    'general',
    'Web Development Notes',
    'Notes on HTML, CSS, and JavaScript. Building responsive web applications with modern frameworks like React and Vue.'
  );

  await context.noteManager.createNote(
    'general',
    'Programming Fundamentals',
    'Core programming concepts including algorithms, data structures, and design patterns. Essential knowledge for software development.'
  );

  // Project notes
  await context.noteManager.createNote(
    'projects',
    'Website Redesign Project',
    'Planning the complete redesign of our company website. Focus on user experience and modern web technologies. Timeline and requirements analysis.'
  );

  await context.noteManager.createNote(
    'projects',
    'API Development Project',
    'Building a REST API using Node.js and Express. Need to implement authentication, rate limiting, and proper error handling.'
  );

  await context.noteManager.createNote(
    'projects',
    'Mobile App Project',
    'Developing a cross-platform mobile application. Considering React Native vs Flutter for the development framework.'
  );

  // Meeting notes
  await context.noteManager.createNote(
    'meetings',
    'Team Standup - 2024-01-15',
    'Discussed current sprint progress. JavaScript refactoring is on track. Python migration needs more time. Blocked issues resolved.'
  );

  await context.noteManager.createNote(
    'meetings',
    'Client Meeting - Project Requirements',
    'Client wants additional features in the web application. Need to estimate development time for JavaScript components and backend integration.'
  );

  await context.noteManager.createNote(
    'meetings',
    'Architecture Review',
    'Reviewed system architecture and identified performance bottlenecks. Discussed microservices migration strategy and database optimization.'
  );

  // Research notes
  await context.noteManager.createNote(
    'research',
    'Performance Optimization Research',
    'Investigating various performance optimization techniques for web applications. Comparing bundling strategies and caching mechanisms.'
  );

  await context.noteManager.createNote(
    'research',
    'Security Best Practices',
    'Research on security vulnerabilities and mitigation strategies. Focus on authentication, authorization, and data protection.'
  );
}
