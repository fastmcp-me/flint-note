/**
 * Consolidated Search Integration Tests
 *
 * Tests search functionality through both direct manager calls and MCP protocol.
 * Consolidates search-integration.test.ts, search-notes.test.ts, and search-index-update.test.ts
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  createIntegrationTestContext,
  cleanupIntegrationTestContext,
  createIntegrationTestNotes,
  MCPIntegrationClient,
  IntegrationTestAssertions,
  INTEGRATION_TEST_CONSTANTS
} from './helpers/integration-utils.ts';
import type { IntegrationTestContext } from './helpers/integration-utils.ts';

describe('Consolidated Search Integration Tests', () => {
  let context: IntegrationTestContext;
  let mcpClient: MCPIntegrationClient | null = null;

  beforeEach(async () => {
    context = await createIntegrationTestContext('search-consolidated');
    await createIntegrationTestNotes(context);
    await context.searchManager.rebuildSearchIndex();
  });

  afterEach(async () => {
    if (mcpClient) {
      await mcpClient.stop();
      mcpClient = null;
    }
    await cleanupIntegrationTestContext(context);
  });

  describe('Direct Search Manager Tests', () => {
    describe('Basic Search Operations', () => {
      test('should search notes by content', async () => {
        const results = await context.searchManager.searchNotes('JavaScript');

        assert.ok(results.length > 0, 'Should find JavaScript notes');
        IntegrationTestAssertions.assertSearchResults(results);

        // Verify results contain JavaScript
        const hasJavaScript = results.some(
          note =>
            note.title.toLowerCase().includes('javascript') ||
            note.snippet.toLowerCase().includes('javascript')
        );
        assert.ok(hasJavaScript, 'Results should contain JavaScript');
      });

      test('should search notes by title', async () => {
        const results = await context.searchManager.searchNotes('Tutorial');

        assert.ok(results.length > 0, 'Should find tutorial notes');
        const foundTutorial = results.find(note => note.title.includes('Tutorial'));
        assert.ok(foundTutorial, 'Should find note with Tutorial in title');
      });

      test('should handle multiple search terms', async () => {
        const results = await context.searchManager.searchNotes('JavaScript programming');

        assert.ok(results.length > 0, 'Should find notes with multiple terms');
        // Results should be ranked by relevance
        for (let i = 0; i < results.length - 1; i++) {
          assert.ok(
            results[i].score >= results[i + 1].score,
            'Results should be sorted by relevance score'
          );
        }
      });

      test('should be case insensitive', async () => {
        const queries = INTEGRATION_TEST_CONSTANTS.SEARCH_QUERIES.CASE_INSENSITIVE;
        const allResults = [];

        for (const query of queries) {
          const results = await context.searchManager.searchNotes(query);
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

      test('should return all notes for empty query', async () => {
        const results = await context.searchManager.searchNotes('');

        assert.ok(results.length > 0, 'Should return notes for empty query');
        // Should be sorted by last updated
        for (let i = 0; i < results.length - 1; i++) {
          const current = new Date(results[i].lastUpdated).getTime();
          const next = new Date(results[i + 1].lastUpdated).getTime();
          assert.ok(current >= next, 'Should be sorted by last updated descending');
        }
      });

      test('should handle query with no matches', async () => {
        const results = await context.searchManager.searchNotes(
          INTEGRATION_TEST_CONSTANTS.SEARCH_QUERIES.NO_RESULTS
        );

        assert.ok(Array.isArray(results), 'Should return array');
        assert.strictEqual(results.length, 0, 'Should return empty array for no matches');
      });
    });

    describe('Type Filtering', () => {
      test('should filter by note type', async () => {
        const allResults = await context.searchManager.searchNotes('project');
        const filteredResults = await context.searchManager.searchNotes(
          'project',
          'projects'
        );

        assert.ok(allResults.length > 0, 'Should find project notes');
        assert.ok(filteredResults.length > 0, 'Should find filtered project notes');

        // All filtered results should be from 'projects' type
        for (const result of filteredResults) {
          assert.strictEqual(
            result.type,
            'projects',
            'Filtered results should match type'
          );
        }
      });

      test('should return empty array for non-existent type', async () => {
        const results = await context.searchManager.searchNotes(
          'test',
          'nonexistenttype'
        );

        assert.ok(Array.isArray(results), 'Should return array');
        assert.strictEqual(
          results.length,
          0,
          'Should return empty for non-existent type'
        );
      });

      test('should handle null type filter', async () => {
        const withoutFilter = await context.searchManager.searchNotes('test');
        const withNullFilter = await context.searchManager.searchNotes('test', null);

        assert.strictEqual(
          withoutFilter.length,
          withNullFilter.length,
          'Null filter should be same as no filter'
        );
      });
    });

    describe('Result Limiting and Ranking', () => {
      test('should respect limit parameter', async () => {
        // Create additional notes to test limiting
        for (let i = 0; i < 5; i++) {
          await context.noteManager.createNote(
            'general',
            `Test Note ${i}`,
            `Content with searchterm ${i}`
          );
        }
        await context.searchManager.rebuildSearchIndex();

        const results = await context.searchManager.searchNotes('searchterm', null, 3);

        assert.ok(results.length <= 3, 'Should respect limit parameter');
      });

      test('should rank title matches higher than content matches', async () => {
        await context.noteManager.createNote(
          'general',
          'Python Best Practices',
          'General programming content'
        );
        await context.noteManager.createNote(
          'general',
          'General Programming',
          'This guide covers Python extensively'
        );
        await context.searchManager.rebuildSearchIndex();

        const results = await context.searchManager.searchNotes('Python');

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
            'Title matches should have higher scores'
          );
        }
      });

      test('should generate meaningful snippets with highlighting', async () => {
        const results = await context.searchManager.searchNotes('JavaScript');

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
    });
  });

  describe('Search Index Management', () => {
    test('should update search index when creating notes', async () => {
      const uniqueTitle = `Test Note ${Date.now()}`;
      const uniqueContent = `This is unique content ${Math.random()}`;

      await context.noteManager.createNote('general', uniqueTitle, uniqueContent);

      // Search should immediately find the new note
      const results = await context.searchManager.searchNotes('unique content');

      assert.ok(results.length > 0, 'Should find newly created note');
      const foundNote = results.find(note => note.title === uniqueTitle);
      assert.ok(foundNote, 'Should find note with correct title');
    });

    test('should update search index when updating notes', async () => {
      const originalTitle = `Original Title ${Date.now()}`;
      const originalKeyword = `oldkeyword${Date.now()}`;
      const newKeyword = `newkeyword${Date.now()}`;

      // Create note with original content
      const noteInfo = await context.noteManager.createNote(
        'general',
        originalTitle,
        `Content with ${originalKeyword}`
      );

      // Update with new content
      await context.noteManager.updateNote(noteInfo.id, `Content with ${newKeyword}`);

      // Should find new content
      const newResults = await context.searchManager.searchNotes(newKeyword);
      assert.ok(newResults.length > 0, 'Should find note with new keyword');

      // Should not find old content
      const oldResults = await context.searchManager.searchNotes(originalKeyword);
      const oldNote = oldResults.find(note => note.title === originalTitle);
      assert.ok(!oldNote, 'Should not find note with old keyword after update');
    });

    test('should maintain index consistency across operations', async () => {
      // Create initial notes
      const createdNotes = [];
      for (let i = 0; i < 3; i++) {
        const noteInfo = await context.noteManager.createNote(
          'general',
          `Note ${i}`,
          `Content ${i}`
        );
        createdNotes.push(noteInfo);
      }

      // Verify all notes are searchable
      let allResults = await context.searchManager.searchNotes('Content');
      assert.ok(allResults.length >= 3, 'Should find all created notes');

      // Update one note
      await context.noteManager.updateNote(createdNotes[1].id, 'Updated Content');

      // Delete one note
      await context.noteManager.deleteNote(createdNotes[2].id);

      // Verify changes are reflected
      allResults = await context.searchManager.searchNotes('Content');
      const updatedResults = await context.searchManager.searchNotes('Updated');

      assert.strictEqual(updatedResults.length, 1, 'Should find updated note');
    });

    test('should handle concurrent note creation', async () => {
      const promises = [];
      const noteCount = 5;

      // Create multiple notes concurrently
      for (let i = 0; i < noteCount; i++) {
        const title = `Concurrent Note ${i} ${Date.now()}`;
        const content = `Concurrent content ${i}`;
        promises.push(context.noteManager.createNote('general', title, content));
      }

      await Promise.all(promises);

      // All notes should be searchable
      const searchResults = await context.searchManager.searchNotes('Concurrent');
      assert.ok(
        searchResults.length >= noteCount,
        'Should find all concurrently created notes'
      );
    });
  });

  describe('MCP Protocol Search Integration', () => {
    beforeEach(async () => {
      mcpClient = new MCPIntegrationClient(context.tempDir);
      await mcpClient.start();
    });

    describe('MCP Search Tool Response Format', () => {
      test('should return properly formatted search results via MCP', async () => {
        const response = await mcpClient!.callTool('search_notes', {
          query: 'JavaScript',
          limit: 5
        });

        assert.ok(response.content, 'Should have content array');
        assert.ok(Array.isArray(response.content), 'Content should be array');
        assert.strictEqual(response.content.length, 1, 'Should have one content item');
        assert.strictEqual(
          response.content[0].type,
          'text',
          'Content type should be text'
        );

        const results = JSON.parse(response.content[0].text);
        IntegrationTestAssertions.assertSearchResults(results);
      });

      test('should handle empty search results via MCP', async () => {
        const response = await mcpClient!.callTool('search_notes', {
          query: INTEGRATION_TEST_CONSTANTS.SEARCH_QUERIES.NO_RESULTS,
          limit: 10
        });

        assert.ok(response.content);
        const results = JSON.parse(response.content[0].text);
        assert.ok(Array.isArray(results));
        assert.strictEqual(results.length, 0);
      });
    });

    describe('MCP Search Parameter Handling', () => {
      test('should handle all search parameters via MCP', async () => {
        const response = await mcpClient!.callTool('search_notes', {
          query: 'JavaScript',
          type_filter: 'general',
          limit: 3,
          use_regex: false
        });

        const results = JSON.parse(response.content[0].text);
        assert.ok(Array.isArray(results));
        assert.ok(results.length <= 3, 'Should respect limit');

        // All results should be from 'general' type if any found
        for (const result of results) {
          assert.strictEqual(result.type, 'general', 'Should respect type filter');
        }
      });

      test('should handle minimal parameters via MCP', async () => {
        const response = await mcpClient!.callTool('search_notes', {
          query: 'test'
        });

        const results = JSON.parse(response.content[0].text);
        assert.ok(Array.isArray(results));
        assert.ok(results.length <= 10, 'Should use default limit');
      });

      test('should handle missing query parameter via MCP', async () => {
        const response = await mcpClient!.callTool('search_notes', {
          limit: 5
        });

        const results = JSON.parse(response.content[0].text);
        assert.ok(Array.isArray(results));
        assert.ok(results.length > 0, 'Should return all notes when query is missing');
      });
    });

    describe('MCP Search Quality and Integration', () => {
      test('should find newly created notes via MCP', async () => {
        // Create a new note through MCP
        const uniqueTitle = `MCP Integration Test ${Date.now()}`;
        const createResponse = await mcpClient!.callTool('create_note', {
          type: 'general',
          title: uniqueTitle,
          content: 'This is a unique test note for MCP integration testing.'
        });

        IntegrationTestAssertions.assertNoteCreationResponse(
          JSON.parse(createResponse.content[0].text)
        );

        // Search for the new note via MCP
        const searchResponse = await mcpClient!.callTool('search_notes', {
          query: 'unique test note',
          limit: 10
        });

        const results = JSON.parse(searchResponse.content[0].text);
        const foundNote = results.find(
          (note: { title: string }) => note.title === uniqueTitle
        );
        assert.ok(foundNote, 'Should find newly created note via MCP');
      });

      test('should maintain search quality across MCP operations', async () => {
        const searchResponse = await mcpClient!.callTool('search_notes', {
          query: 'JavaScript programming',
          limit: 10
        });

        const results = JSON.parse(searchResponse.content[0].text);

        if (results.length > 1) {
          // Results should be sorted by relevance
          for (let i = 0; i < results.length - 1; i++) {
            assert.ok(
              results[i].score >= results[i + 1].score,
              'MCP search results should be sorted by relevance'
            );
          }
        }

        // Should highlight search terms
        for (const result of results) {
          if (result.snippet.toLowerCase().includes('javascript')) {
            assert.ok(
              result.snippet.includes('**'),
              'MCP search should highlight terms in snippets'
            );
          }
        }
      });
    });

    describe('MCP Error Handling', () => {
      test('should handle special characters in search query via MCP', async () => {
        const response = await mcpClient!.callTool('search_notes', {
          query: 'Node.js & React (2024)',
          limit: 10
        });

        const results = JSON.parse(response.content[0].text);
        assert.ok(Array.isArray(results), 'Should handle special characters gracefully');
      });

      test('should handle zero and negative limits via MCP', async () => {
        const zeroResponse = await mcpClient!.callTool('search_notes', {
          query: 'test',
          limit: 0
        });

        const zeroResults = JSON.parse(zeroResponse.content[0].text);
        assert.ok(Array.isArray(zeroResults));
        assert.strictEqual(zeroResults.length, 0);

        // Negative limit should be handled gracefully
        const negativeResponse = await mcpClient!.callTool('search_notes', {
          query: 'test',
          limit: -5
        });

        const negativeResults = JSON.parse(negativeResponse.content[0].text);
        assert.ok(Array.isArray(negativeResults));
      });
    });
  });

  describe('Edge Cases and Performance', () => {
    test('should handle notes with special characters', async () => {
      const specialContent = 'Content with special chars: @#$%^&*()[]{}|;:,.<>?';
      const title = `Special Chars ${Date.now()}`;

      await context.noteManager.createNote('general', title, specialContent);

      const results = await context.searchManager.searchNotes('special chars');
      assert.ok(results.length > 0, 'Should find note with special characters');
    });

    test('should handle very long note content', async () => {
      const longContent = 'This is a very long note. '.repeat(1000);
      const title = `Long Note ${Date.now()}`;

      await context.noteManager.createNote('general', title, longContent);

      const results = await context.searchManager.searchNotes('very long note');
      assert.ok(results.length > 0, 'Should find note with long content');

      const foundNote = results.find(note => note.title === title);
      assert.ok(foundNote, 'Should find the long note');
      assert.ok(
        foundNote.snippet.length <= 300,
        'Snippet should be truncated to reasonable length'
      );
    });

    test('should handle search with regex patterns', async () => {
      await context.noteManager.createNote(
        'general',
        'Test Pattern',
        'This contains test123 and test456'
      );
      await context.searchManager.rebuildSearchIndex();

      const results = await context.searchManager.searchNotes('test\\d+', null, 10, true);

      assert.ok(Array.isArray(results), 'Should handle regex search');
      if (results.length > 0) {
        const foundNote = results.find(note => note.title === 'Test Pattern');
        assert.ok(foundNote, 'Should find note matching regex pattern');
      }
    });
  });
});
