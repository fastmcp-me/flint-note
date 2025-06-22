/**
 * MCP search tool integration tests
 * Tests search_notes tool through the MCP server interface
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Workspace } from '../src/core/workspace.ts';
import { SearchManager } from '../src/core/search.ts';
import { NoteManager } from '../src/core/notes.ts';

interface TestContext {
  tempDir: string;
  workspace: Workspace;
  searchManager: SearchManager;
  noteManager: NoteManager;
}

// Mock MCP tool call response
interface SearchToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

// Simulate the search_notes MCP tool
async function callSearchTool(
  context: TestContext,
  args: {
    query: string;
    type_filter?: string;
    limit?: number;
  }
): Promise<SearchToolResponse> {
  const results = await context.searchManager.searchNotes(
    args.query,
    args.type_filter || null,
    args.limit || 10
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }
    ]
  };
}

describe('MCP Search Tool Integration Tests', () => {
  let context: TestContext;

  beforeEach(async () => {
    // Create temporary workspace
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'jade-note-mcp-search-test-')
    );
    const workspace = new Workspace(tempDir);

    // Initialize managers
    const searchManager = new SearchManager(workspace);
    const noteManager = new NoteManager(workspace);

    // Create test workspace structure
    await workspace.initialize();
    await workspace.ensureNoteType('general');
    await workspace.ensureNoteType('projects');
    await workspace.ensureNoteType('meetings');

    context = {
      tempDir,
      workspace,
      searchManager,
      noteManager
    };

    // Create test notes and build search index
    await createTestNotes(context);
    await context.searchManager.rebuildSearchIndex();
  });

  afterEach(async () => {
    await fs.rm(context.tempDir, { recursive: true, force: true });
  });

  describe('MCP Tool Response Format', () => {
    test('should return properly formatted search results', async () => {
      const response = await callSearchTool(context, {
        query: 'JavaScript',
        limit: 5
      });

      assert.ok(response.content, 'Should have content array');
      assert.ok(Array.isArray(response.content), 'Content should be array');
      assert.strictEqual(response.content.length, 1, 'Should have one content item');
      assert.strictEqual(response.content[0].type, 'text', 'Content type should be text');

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results), 'Parsed content should be array');

      if (results.length > 0) {
        const result = results[0];
        assert.ok(typeof result.id === 'string', 'Result should have string id');
        assert.ok(typeof result.title === 'string', 'Result should have string title');
        assert.ok(typeof result.type === 'string', 'Result should have string type');
        assert.ok(Array.isArray(result.tags), 'Result should have tags array');
        assert.ok(typeof result.score === 'number', 'Result should have numeric score');
        assert.ok(
          typeof result.snippet === 'string',
          'Result should have string snippet'
        );
        assert.ok(
          typeof result.lastUpdated === 'string',
          'Result should have lastUpdated string'
        );
      }
    });

    test('should handle empty search results', async () => {
      const response = await callSearchTool(context, {
        query: 'nonexistentterm12345',
        limit: 10
      });

      assert.ok(response.content);
      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 0);
    });
  });

  describe('Search Parameter Handling', () => {
    test('should handle query parameter', async () => {
      const response = await callSearchTool(context, {
        query: 'JavaScript'
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));
      assert.ok(results.length > 0, 'Should find JavaScript notes');
    });

    test('should handle type_filter parameter', async () => {
      const response = await callSearchTool(context, {
        query: 'project',
        type_filter: 'projects'
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));

      // All results should be from 'projects' type
      for (const result of results) {
        assert.strictEqual(result.type, 'projects');
      }
    });

    test('should handle limit parameter', async () => {
      const response = await callSearchTool(context, {
        query: 'test',
        limit: 3
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));
      assert.ok(results.length <= 3, 'Should respect limit parameter');
    });

    test('should use default limit when not specified', async () => {
      const response = await callSearchTool(context, {
        query: 'the' // Common word likely to match many notes
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));
      assert.ok(results.length <= 10, 'Should use default limit of 10');
    });
  });

  describe('Search Quality and Ranking', () => {
    test('should rank results by relevance score', async () => {
      const response = await callSearchTool(context, {
        query: 'JavaScript programming',
        limit: 10
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));

      if (results.length > 1) {
        // Results should be sorted by score (highest first)
        for (let i = 0; i < results.length - 1; i++) {
          assert.ok(
            results[i].score >= results[i + 1].score,
            'Results should be sorted by relevance score'
          );
        }
      }
    });

    test('should generate meaningful snippets', async () => {
      const response = await callSearchTool(context, {
        query: 'JavaScript',
        limit: 5
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));

      for (const result of results) {
        assert.ok(typeof result.snippet === 'string', 'Should have snippet');
        assert.ok(result.snippet.length > 0, 'Snippet should not be empty');
        assert.ok(result.snippet.length <= 250, 'Snippet should be reasonable length');

        if (result.snippet.toLowerCase().includes('javascript')) {
          assert.ok(
            result.snippet.includes('**'),
            'Should highlight search terms in snippets'
          );
        }
      }
    });

    test('should prioritize title matches over content matches', async () => {
      const response = await callSearchTool(context, {
        query: 'Python',
        limit: 10
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));

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
  });

  describe('Integration with Note Operations', () => {
    test('should find newly created notes', async () => {
      // Create a new note
      const uniqueTitle = `Integration Test Note ${Date.now()}`;
      await context.noteManager.createNote(
        'general',
        uniqueTitle,
        'This is a unique test note for integration testing.'
      );

      // Rebuild search index to include new note
      await context.searchManager.rebuildSearchIndex();

      // Search for the new note
      const response = await callSearchTool(context, {
        query: 'unique test note',
        limit: 10
      });

      const results = JSON.parse(response.content[0].text);
      const foundNote = results.find(
        (note: { title: string }) => note.title === uniqueTitle
      );
      assert.ok(foundNote, 'Should find newly created note');
    });

    test('should search across all note types', async () => {
      const response = await callSearchTool(context, {
        query: 'JavaScript',
        limit: 20
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));

      // Should find notes from multiple types
      const types = new Set(results.map((note: { type: string }) => note.type));
      assert.ok(types.size > 0, 'Should find notes from at least one type');

      // Verify all results contain the search term
      for (const result of results) {
        const hasTermInTitle = result.title.toLowerCase().includes('javascript');
        const hasTermInSnippet = result.snippet.toLowerCase().includes('javascript');
        assert.ok(
          hasTermInTitle || hasTermInSnippet,
          `Result should contain "JavaScript" in title or snippet. Title: "${result.title}"`
        );
      }
    });

    test('should handle case-insensitive searches', async () => {
      const queries = ['JavaScript', 'javascript', 'JAVASCRIPT'];
      const allResults = [];

      for (const query of queries) {
        const response = await callSearchTool(context, {
          query,
          limit: 5
        });
        const results = JSON.parse(response.content[0].text);
        allResults.push(results);
      }

      // All case variations should return the same results
      assert.strictEqual(allResults[0].length, allResults[1].length);
      assert.strictEqual(allResults[1].length, allResults[2].length);

      if (allResults[0].length > 0) {
        assert.strictEqual(allResults[0][0].id, allResults[1][0].id);
        assert.strictEqual(allResults[0][0].id, allResults[2][0].id);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty query gracefully', async () => {
      const response = await callSearchTool(context, {
        query: '',
        limit: 10
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));
      assert.ok(results.length > 0, 'Should return all notes for empty query');
      // Results should be sorted by last updated (most recent first)
      for (let i = 0; i < results.length - 1; i++) {
        const current = new Date(results[i].lastUpdated).getTime();
        const next = new Date(results[i + 1].lastUpdated).getTime();
        assert.ok(current >= next, 'Results should be sorted by last updated descending');
      }
    });

    test('should handle whitespace-only query', async () => {
      const response = await callSearchTool(context, {
        query: '   \t\n   ',
        limit: 10
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));
      assert.ok(results.length > 0, 'Should return all notes for whitespace query');
    });

    test('should handle special characters in query', async () => {
      const response = await callSearchTool(context, {
        query: 'Node.js & React (2024)',
        limit: 10
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));
      // Should not throw errors and handle gracefully
    });

    test('should handle non-existent type filter', async () => {
      const response = await callSearchTool(context, {
        query: 'test',
        type_filter: 'nonexistenttype',
        limit: 10
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 0);
    });

    test('should handle zero and negative limits', async () => {
      const zeroResponse = await callSearchTool(context, {
        query: 'test',
        limit: 0
      });

      const zeroResults = JSON.parse(zeroResponse.content[0].text);
      assert.ok(Array.isArray(zeroResults));
      assert.strictEqual(zeroResults.length, 0);

      // Negative limit should be handled gracefully
      const negativeResponse = await callSearchTool(context, {
        query: 'test',
        limit: -5
      });

      const negativeResults = JSON.parse(negativeResponse.content[0].text);
      assert.ok(Array.isArray(negativeResults));
    });

    test('should handle very large limit values', async () => {
      const response = await callSearchTool(context, {
        query: 'test',
        limit: 999999
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results));
      // Should not crash or cause performance issues
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
}
