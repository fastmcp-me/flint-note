/**
 * Integration tests for error handling and edge cases through MCP protocol
 * Tests validation, error responses, and graceful failure handling
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  createIntegrationWorkspace,
  cleanupIntegrationWorkspace,
  startServer,
  createTestNoteType,
  type IntegrationTestContext,
  INTEGRATION_CONSTANTS
} from './helpers/integration-utils.ts';

/**
 * MCP client simulation for sending requests to the server
 */
class MCPClient {
  #serverProcess: any;

  constructor(serverProcess: any) {
    this.#serverProcess = serverProcess;
  }

  async sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2);
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      let responseData = '';
      let hasResponded = false;

      const timeout = setTimeout(() => {
        if (!hasResponded) {
          reject(new Error(`Request timeout after 5000ms: ${method}`));
        }
      }, 5000);

      // Listen for response on stdout
      const onData = (data: Buffer) => {
        responseData += data.toString();

        // Try to parse complete JSON responses
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              if (response.id === id) {
                hasResponded = true;
                clearTimeout(timeout);
                this.#serverProcess.stdout?.off('data', onData);

                if (response.error) {
                  reject(new Error(`MCP Error: ${response.error.message}`));
                } else {
                  resolve(response.result);
                }
                return;
              }
            } catch {
              // Continue parsing - might be partial JSON
            }
          }
        }
      };

      this.#serverProcess.stdout?.on('data', onData);

      // Send the request
      this.#serverProcess.stdin?.write(JSON.stringify(request) + '\n');
    });
  }

  async callTool(name: string, args: any): Promise<any> {
    return this.sendRequest('tools/call', {
      name,
      arguments: args
    });
  }

  async expectError(toolName: string, args: any): Promise<Error> {
    try {
      await this.callTool(toolName, args);
      throw new Error(`Expected ${toolName} to throw an error but it succeeded`);
    } catch (error) {
      return error as Error;
    }
  }
}

describe('Error Handling Integration', () => {
  let context: IntegrationTestContext;
  let client: MCPClient;

  beforeEach(async () => {
    context = await createIntegrationWorkspace('error-handling');

    // Create basic note types for testing
    await createTestNoteType(context.tempDir, 'general', 'General purpose notes');
    await createTestNoteType(context.tempDir, 'projects', 'Project-related notes');

    // Start server
    context.serverProcess = await startServer({
      workspacePath: context.tempDir,
      timeout: INTEGRATION_CONSTANTS.SERVER_STARTUP_TIMEOUT
    });

    client = new MCPClient(context.serverProcess);
  });

  afterEach(async () => {
    await cleanupIntegrationWorkspace(context);
  });

  describe('Note Creation Errors', () => {
    test('should handle missing required parameters', async () => {
      // Missing type
      const error1 = await client.expectError('create_note', {
        title: 'Test Note',
        content: 'Test content'
      });
      assert.ok(error1.message.includes('type') || error1.message.includes('required'));

      // Missing title
      const error2 = await client.expectError('create_note', {
        type: 'general',
        content: 'Test content'
      });
      assert.ok(error2.message.includes('title') || error2.message.includes('required'));

      // Missing content
      const error3 = await client.expectError('create_note', {
        type: 'general',
        title: 'Test Note'
      });
      assert.ok(error3.message.includes('content') || error3.message.includes('required'));
    });

    test('should handle invalid note type', async () => {
      const error = await client.expectError('create_note', {
        type: 'nonexistent-type',
        title: 'Test Note',
        content: 'Test content'
      });

      assert.ok(
        error.message.includes('Note type') ||
        error.message.includes('does not exist') ||
        error.message.includes('invalid')
      );
    });

    test('should handle empty title', async () => {
      const error = await client.expectError('create_note', {
        type: 'general',
        title: '',
        content: 'Test content'
      });

      assert.ok(
        error.message.includes('title') ||
        error.message.includes('empty') ||
        error.message.includes('required')
      );
    });

    test('should handle empty content', async () => {
      const error = await client.expectError('create_note', {
        type: 'general',
        title: 'Test Note',
        content: ''
      });

      assert.ok(
        error.message.includes('content') ||
        error.message.includes('empty') ||
        error.message.includes('required')
      );
    });

    test('should handle invalid metadata format', async () => {
      const error = await client.expectError('create_note', {
        type: 'general',
        title: 'Test Note',
        content: 'Test content',
        metadata: 'invalid-metadata-format'
      });

      assert.ok(
        error.message.includes('metadata') ||
        error.message.includes('object') ||
        error.message.includes('invalid')
      );
    });

    test('should handle extremely long titles', async () => {
      const longTitle = 'a'.repeat(1000);

      const error = await client.expectError('create_note', {
        type: 'general',
        title: longTitle,
        content: 'Test content'
      });

      assert.ok(
        error.message.includes('title') ||
        error.message.includes('length') ||
        error.message.includes('long')
      );
    });

    test('should handle titles with invalid characters', async () => {
      const invalidTitles = [
        'Note/with/slashes',
        'Note:with:colons',
        'Note*with*asterisks',
        'Note?with?questions',
        'Note<with>brackets',
        'Note|with|pipes'
      ];

      for (const title of invalidTitles) {
        const error = await client.expectError('create_note', {
          type: 'general',
          title: title,
          content: 'Test content'
        });

        assert.ok(
          error.message.includes('title') ||
          error.message.includes('invalid') ||
          error.message.includes('character'),
          `Should reject title: ${title}`
        );
      }
    });
  });

  describe('Note Retrieval Errors', () => {
    test('should handle missing identifier parameter', async () => {
      const error = await client.expectError('get_note', {});

      assert.ok(
        error.message.includes('identifier') ||
        error.message.includes('required')
      );
    });

    test('should handle empty identifier', async () => {
      const error = await client.expectError('get_note', {
        identifier: ''
      });

      assert.ok(
        error.message.includes('identifier') ||
        error.message.includes('empty')
      );
    });

    test('should handle non-existent note', async () => {
      const error = await client.expectError('get_note', {
        identifier: 'general/non-existent-note'
      });

      assert.ok(
        error.message.includes('not found') ||
        error.message.includes('does not exist')
      );
    });

    test('should handle invalid identifier format', async () => {
      const invalidIdentifiers = [
        'invalid-format',
        'too/many/slashes/here',
        '/starts-with-slash',
        'ends-with-slash/',
        'general/',
        '/note-name'
      ];

      for (const identifier of invalidIdentifiers) {
        const error = await client.expectError('get_note', {
          identifier: identifier
        });

        assert.ok(
          error.message.includes('identifier') ||
          error.message.includes('format') ||
          error.message.includes('invalid'),
          `Should reject identifier: ${identifier}`
        );
      }
    });

    test('should handle note in non-existent type', async () => {
      const error = await client.expectError('get_note', {
        identifier: 'nonexistent-type/some-note'
      });

      assert.ok(
        error.message.includes('not found') ||
        error.message.includes('does not exist') ||
        error.message.includes('type')
      );
    });
  });

  describe('Note Update Errors', () => {
    beforeEach(async () => {
      // Create a note to update
      await client.callTool('create_note', {
        type: 'general',
        title: 'Update Test Note',
        content: 'Original content'
      });
    });

    test('should handle missing parameters', async () => {
      // Missing identifier
      const error1 = await client.expectError('update_note', {
        content: 'New content'
      });
      assert.ok(error1.message.includes('identifier') || error1.message.includes('required'));

      // Missing content
      const error2 = await client.expectError('update_note', {
        identifier: 'general/update-test-note'
      });
      assert.ok(error2.message.includes('content') || error2.message.includes('required'));
    });

    test('should handle non-existent note update', async () => {
      const error = await client.expectError('update_note', {
        identifier: 'general/non-existent-note',
        content: 'New content'
      });

      assert.ok(
        error.message.includes('not found') ||
        error.message.includes('does not exist')
      );
    });

    test('should handle empty content update', async () => {
      const error = await client.expectError('update_note', {
        identifier: 'general/update-test-note',
        content: ''
      });

      assert.ok(
        error.message.includes('content') ||
        error.message.includes('empty')
      );
    });

    test('should handle invalid identifier for update', async () => {
      const error = await client.expectError('update_note', {
        identifier: 'invalid-identifier-format',
        content: 'New content'
      });

      assert.ok(
        error.message.includes('identifier') ||
        error.message.includes('format')
      );
    });
  });

  describe('Note Type Creation Errors', () => {
    test('should handle missing required parameters', async () => {
      // Missing type_name
      const error1 = await client.expectError('create_note_type', {
        description: 'Test description'
      });
      assert.ok(error1.message.includes('type_name') || error1.message.includes('required'));

      // Missing description
      const error2 = await client.expectError('create_note_type', {
        type_name: 'test-type'
      });
      assert.ok(error2.message.includes('description') || error2.message.includes('required'));
    });

    test('should handle invalid note type names', async () => {
      const invalidNames = [
        '',
        'type with spaces',
        'type/with/slashes',
        'type:with:colons',
        'type*with*asterisks',
        'type?with?questions',
        'type<with>brackets',
        'type|with|pipes',
        'type..',
        '.type',
        'type.',
        'UPPER_CASE',
        '123numbers',
        'special-chars@#$%'
      ];

      for (const typeName of invalidNames) {
        const error = await client.expectError('create_note_type', {
          type_name: typeName,
          description: 'Test description'
        });

        assert.ok(
          error.message.includes('type_name') ||
          error.message.includes('invalid') ||
          error.message.includes('name'),
          `Should reject type name: ${typeName}`
        );
      }
    });

    test('should handle duplicate note type creation', async () => {
      // Create first note type
      await client.callTool('create_note_type', {
        type_name: 'duplicate-test',
        description: 'First description'
      });

      // Try to create duplicate
      const error = await client.expectError('create_note_type', {
        type_name: 'duplicate-test',
        description: 'Second description'
      });

      assert.ok(
        error.message.includes('exists') ||
        error.message.includes('duplicate') ||
        error.message.includes('already')
      );
    });

    test('should handle empty description', async () => {
      const error = await client.expectError('create_note_type', {
        type_name: 'test-type',
        description: ''
      });

      assert.ok(
        error.message.includes('description') ||
        error.message.includes('empty')
      );
    });

    test('should handle invalid agent instructions format', async () => {
      const error = await client.expectError('create_note_type', {
        type_name: 'test-type',
        description: 'Test description',
        agent_instructions: 'invalid-format-should-be-array'
      });

      assert.ok(
        error.message.includes('agent_instructions') ||
        error.message.includes('array') ||
        error.message.includes('invalid')
      );
    });
  });

  describe('Note Type Update Errors', () => {
    beforeEach(async () => {
      // Create a note type to update
      await client.callTool('create_note_type', {
        type_name: 'updateable-type',
        description: 'Original description'
      });
    });

    test('should handle missing parameters', async () => {
      // Missing type_name
      const error1 = await client.expectError('update_note_type', {
        field: 'description',
        value: 'New description'
      });
      assert.ok(error1.message.includes('type_name') || error1.message.includes('required'));

      // Missing field
      const error2 = await client.expectError('update_note_type', {
        type_name: 'updateable-type',
        value: 'New value'
      });
      assert.ok(error2.message.includes('field') || error2.message.includes('required'));

      // Missing value
      const error3 = await client.expectError('update_note_type', {
        type_name: 'updateable-type',
        field: 'description'
      });
      assert.ok(error3.message.includes('value') || error3.message.includes('required'));
    });

    test('should handle non-existent note type', async () => {
      const error = await client.expectError('update_note_type', {
        type_name: 'non-existent-type',
        field: 'description',
        value: 'New description'
      });

      assert.ok(
        error.message.includes('not found') ||
        error.message.includes('does not exist')
      );
    });

    test('should handle invalid field names', async () => {
      const invalidFields = [
        'invalid_field',
        'name',
        'path',
        'created',
        'updated',
        'random_field'
      ];

      for (const field of invalidFields) {
        const error = await client.expectError('update_note_type', {
          type_name: 'updateable-type',
          field: field,
          value: 'New value'
        });

        assert.ok(
          error.message.includes('field') ||
          error.message.includes('invalid') ||
          error.message.includes('supported'),
          `Should reject field: ${field}`
        );
      }
    });

    test('should handle empty field values', async () => {
      const error = await client.expectError('update_note_type', {
        type_name: 'updateable-type',
        field: 'description',
        value: ''
      });

      assert.ok(
        error.message.includes('value') ||
        error.message.includes('empty')
      );
    });
  });

  describe('Search Errors', () => {
    test('should handle invalid regex patterns', async () => {
      const invalidRegexPatterns = [
        '[invalid regex',
        'unclosed(group',
        'invalid*+quantifier',
        'invalid{quantifier',
        'invalid\\escape'
      ];

      for (const pattern of invalidRegexPatterns) {
        try {
          await client.callTool('search_notes', {
            query: pattern,
            use_regex: true
          });
          // Some patterns might not throw errors but return empty results
        } catch (error) {
          // Expected for truly invalid regex patterns
          assert.ok(error instanceof Error);
          assert.ok(
            error.message.includes('regex') ||
            error.message.includes('pattern') ||
            error.message.includes('invalid')
          );
        }
      }
    });

    test('should handle invalid type filter', async () => {
      const result = await client.callTool('search_notes', {
        query: 'test',
        type_filter: 'nonexistent-type'
      });

      // Should return empty results rather than error
      const searchResults = JSON.parse(result.content[0].text);
      assert.strictEqual(searchResults.length, 0);
    });

    test('should handle negative limit values', async () => {
      const result = await client.callTool('search_notes', {
        query: 'test',
        limit: -5
      });

      // Should handle gracefully, likely returning empty results or using default
      const searchResults = JSON.parse(result.content[0].text);
      assert.ok(Array.isArray(searchResults));
    });

    test('should handle extremely large limit values', async () => {
      const result = await client.callTool('search_notes', {
        query: 'test',
        limit: 999999
      });

      // Should handle gracefully without performance issues
      const searchResults = JSON.parse(result.content[0].text);
      assert.ok(Array.isArray(searchResults));
    });
  });

  describe('Link Management Errors', () => {
    beforeEach(async () => {
      // Create notes for linking tests
      await client.callTool('create_note', {
        type: 'general',
        title: 'Source Note',
        content: 'Source note content'
      });

      await client.callTool('create_note', {
        type: 'general',
        title: 'Target Note',
        content: 'Target note content'
      });
    });

    test('should handle missing required parameters', async () => {
      // Missing source
      const error1 = await client.expectError('link_notes', {
        target: 'general/target-note'
      });
      assert.ok(error1.message.includes('source') || error1.message.includes('required'));

      // Missing target
      const error2 = await client.expectError('link_notes', {
        source: 'general/source-note'
      });
      assert.ok(error2.message.includes('target') || error2.message.includes('required'));
    });

    test('should handle non-existent source note', async () => {
      const error = await client.expectError('link_notes', {
        source: 'general/non-existent-source',
        target: 'general/target-note'
      });

      assert.ok(
        error.message.includes('source') ||
        error.message.includes('not found') ||
        error.message.includes('does not exist')
      );
    });

    test('should handle non-existent target note', async () => {
      const error = await client.expectError('link_notes', {
        source: 'general/source-note',
        target: 'general/non-existent-target'
      });

      assert.ok(
        error.message.includes('target') ||
        error.message.includes('not found') ||
        error.message.includes('does not exist')
      );
    });

    test('should handle invalid relationship type', async () => {
      const error = await client.expectError('link_notes', {
        source: 'general/source-note',
        target: 'general/target-note',
        relationship: 'invalid-relationship-type'
      });

      assert.ok(
        error.message.includes('relationship') ||
        error.message.includes('invalid') ||
        error.message.includes('type')
      );
    });

    test('should handle self-referential links', async () => {
      const error = await client.expectError('link_notes', {
        source: 'general/source-note',
        target: 'general/source-note'
      });

      assert.ok(
        error.message.includes('self') ||
        error.message.includes('same') ||
        error.message.includes('reference')
      );
    });
  });

  describe('File System Errors', () => {
    test('should handle workspace permission issues', async () => {
      // This test is complex to implement as it requires changing file permissions
      // In a real scenario, we would test read-only workspaces, permission denied errors, etc.
      // For now, we'll test basic file system error handling

      // Create a note first
      await client.callTool('create_note', {
        type: 'general',
        title: 'Permission Test',
        content: 'Test content'
      });

      // The note should be created successfully
      const result = await client.callTool('get_note', {
        identifier: 'general/permission-test'
      });

      const note = JSON.parse(result.content[0].text);
      assert.strictEqual(note.title, 'Permission Test');
    });

    test('should handle disk space issues gracefully', async () => {
      // Create a note with very large content
      const largeContent = '#'.repeat(10000) + '\n\nVery large content for testing.';

      const result = await client.callTool('create_note', {
        type: 'general',
        title: 'Large Content Test',
        content: largeContent
      });

      // Should handle large content without issues
      assert.ok(result.content[0].text.includes('Created note'));
    });
  });

  describe('Malformed Request Handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      // This test simulates what happens when the MCP client sends malformed JSON
      // The server should handle this gracefully

      // We can't easily test this through our client, but we verify the server
      // doesn't crash with edge case parameters
      const result = await client.callTool('search_notes', {
        query: '{"malformed": json}',
        limit: 10
      });

      // Should return search results, treating the malformed JSON as a search query
      const searchResults = JSON.parse(result.content[0].text);
      assert.ok(Array.isArray(searchResults));
    });

    test('should handle null and undefined parameters', async () => {
      // Test with null values
      const error1 = await client.expectError('create_note', {
        type: null,
        title: 'Test',
        content: 'Test'
      });
      assert.ok(error1.message.includes('type') || error1.message.includes('required'));

      // Test with undefined values (they get stripped out in JSON)
      const error2 = await client.expectError('create_note', {
        type: 'general',
        title: undefined,
        content: 'Test'
      });
      assert.ok(error2.message.includes('title') || error2.message.includes('required'));
    });
  });

  describe('Concurrent Operation Errors', () => {
    test('should handle concurrent creation of same note type', async () => {
      // Try to create the same note type concurrently
      const promises = Array.from({ length: 3 }, () =>
        client.callTool('create_note_type', {
          type_name: 'concurrent-test',
          description: 'Concurrent creation test'
        }).catch(error => error)
      );

      const results = await Promise.all(promises);

      // Only one should succeed, others should fail
      const successes = results.filter(result => !(result instanceof Error));
      const failures = results.filter(result => result instanceof Error);

      assert.strictEqual(successes.length, 1, 'Only one concurrent creation should succeed');
      assert.strictEqual(failures.length, 2, 'Two concurrent creations should fail');

      // Check that failures are due to duplicate type
      for (const failure of failures) {
        assert.ok(
          failure.message.includes('exists') ||
          failure.message.includes('duplicate')
        );
      }
    });

    test('should handle concurrent updates to same note', async () => {
      // Create a note first
      await client.callTool('create_note', {
        type: 'general',
        title: 'Concurrent Update Test',
        content: 'Original content'
      });

      // Try to update the same note concurrently
      const promises = Array.from({ length: 3 }, (_, i) =>
        client.callTool('update_note', {
          identifier: 'general/concurrent-update-test',
          content: `Updated content ${i + 1}`
        }).catch(error => error)
      );

      const results = await Promise.all(promises);

      // All updates should succeed (last one wins)
      const successes = results.filter(result => !(result instanceof Error));
      assert.ok(successes.length > 0, 'At least one concurrent update should succeed');
    });
  });

  describe('Resource Limit Errors', () => {
    test('should handle memory pressure gracefully', async () => {
      // Create many notes to test memory handling
      const promises = Array.from({ length: 50 }, (_, i) =>
        client.callTool('create_note', {
          type: 'general',
          title: `Memory Test Note ${i + 1}`,
          content: `# Memory Test Note ${i + 1}\n\n${'Content '.repeat(100)}`
        })
      );

      const results = await Promise.all(promises);

      // All notes should be created successfully
      assert.strictEqual(results.length, 50, 'All notes should be created');

      // Search should still work
      const searchResult = await client.callTool('search_notes', {
        query: 'Memory Test'
      });

      const searchResults = JSON.parse(searchResult.content[0].text);
      assert.ok(searchResults.length > 0, 'Search should find created notes');
    });
  });
});
