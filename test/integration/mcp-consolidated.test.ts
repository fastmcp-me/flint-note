/**
 * Consolidated MCP Integration Tests
 *
 * Tests core MCP server functionality including initialization, capabilities,
 * note operations, and error handling. Consolidates integration.test.ts,
 * note-type-management.test.ts, and other MCP protocol tests.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  createIntegrationTestContext,
  cleanupIntegrationTestContext,
  createIntegrationTestNotes,
  createIntegrationTestNoteTypes,
  MCPIntegrationClient,
  IntegrationTestAssertions,
  INTEGRATION_TEST_CONSTANTS
} from './helpers/integration-utils.ts';
import type { IntegrationTestContext } from './helpers/integration-utils.ts';

describe('Consolidated MCP Integration Tests', () => {
  let context: IntegrationTestContext;
  let mcpClient: MCPIntegrationClient;

  beforeEach(async () => {
    context = await createIntegrationTestContext('mcp-consolidated');
    await createIntegrationTestNotes(context);
    await createIntegrationTestNoteTypes(context);
    await context.searchManager.rebuildSearchIndex();

    mcpClient = new MCPIntegrationClient(context.tempDir);
    await mcpClient.start();
  });

  afterEach(async () => {
    if (mcpClient) {
      await mcpClient.stop();
    }
    await cleanupIntegrationTestContext(context);
  });

  describe('Server Initialization and Capabilities', () => {
    test('should initialize and respond to capabilities', async () => {
      const capabilities = await mcpClient.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      assert.ok(capabilities.capabilities, 'Should have capabilities');
      assert.ok(capabilities.capabilities.tools, 'Should have tools capability');
      assert.ok(capabilities.capabilities.resources, 'Should have resources capability');
      assert.ok(capabilities.serverInfo, 'Should have server info');
      assert.strictEqual(capabilities.serverInfo.name, 'jade-note-mcp-server');
    });

    test('should list available tools', async () => {
      const tools = await mcpClient.sendRequest('tools/list');

      assert.ok(Array.isArray(tools.tools), 'Should return tools array');
      assert.ok(tools.tools.length > 0, 'Should have available tools');

      const toolNames = tools.tools.map((tool: any) => tool.name);
      const expectedTools = [
        'create_note',
        'update_note',
        'delete_note',
        'get_note',
        'search_notes',
        'create_note_type',
        'update_note_type',
        'get_note_type_info',
        'link_notes'
      ];

      for (const expectedTool of expectedTools) {
        assert.ok(
          toolNames.includes(expectedTool),
          `Should include ${expectedTool} tool`
        );
      }
    });

    test('should list available resources', async () => {
      const resources = await mcpClient.sendRequest('resources/list');

      assert.ok(Array.isArray(resources.resources), 'Should return resources array');
      assert.ok(resources.resources.length > 0, 'Should have available resources');

      const resourceUris = resources.resources.map((resource: any) => resource.uri);
      const expectedResources = [
        'jade-note://workspace/stats',
        'jade-note://workspace/note-types',
        'jade-note://workspace/recent-notes'
      ];

      for (const expectedResource of expectedResources) {
        assert.ok(
          resourceUris.includes(expectedResource),
          `Should include ${expectedResource} resource`
        );
      }
    });

    test('should read workspace statistics', async () => {
      const stats = await mcpClient.sendRequest('resources/read', {
        uri: 'jade-note://workspace/stats'
      });

      assert.ok(stats.contents, 'Should have contents');
      assert.ok(stats.contents.length > 0, 'Should have content');

      const statsData = JSON.parse(stats.contents[0].text);
      assert.ok(typeof statsData.totalNotes === 'number', 'Should have totalNotes');
      assert.ok(
        typeof statsData.totalNoteTypes === 'number',
        'Should have totalNoteTypes'
      );
      assert.ok(Array.isArray(statsData.notesByType), 'Should have notesByType array');
    });

    test('should read available note types', async () => {
      const noteTypes = await mcpClient.sendRequest('resources/read', {
        uri: 'jade-note://workspace/note-types'
      });

      assert.ok(noteTypes.contents, 'Should have contents');
      const noteTypesData = JSON.parse(noteTypes.contents[0].text);
      assert.ok(Array.isArray(noteTypesData), 'Should be array of note types');
      assert.ok(noteTypesData.length > 0, 'Should have note types');

      const typeNames = noteTypesData.map((type: any) => type.name);
      assert.ok(typeNames.includes('general'), 'Should include general type');
      assert.ok(typeNames.includes('projects'), 'Should include projects type');
    });

    test('should read recent notes', async () => {
      const recentNotes = await mcpClient.sendRequest('resources/read', {
        uri: 'jade-note://workspace/recent-notes'
      });

      assert.ok(recentNotes.contents, 'Should have contents');
      const notesData = JSON.parse(recentNotes.contents[0].text);
      assert.ok(Array.isArray(notesData), 'Should be array of notes');

      if (notesData.length > 0) {
        const note = notesData[0];
        assert.ok(typeof note.id === 'string', 'Note should have id');
        assert.ok(typeof note.title === 'string', 'Note should have title');
        assert.ok(typeof note.type === 'string', 'Note should have type');
      }
    });
  });

  describe('Note Creation and Management', () => {
    test('should create note in default type', async () => {
      const response = await mcpClient.callTool('create_note', {
        title: 'Test Note via MCP',
        content: 'This note was created via MCP protocol.'
      });

      const result = JSON.parse(response.content[0].text);
      IntegrationTestAssertions.assertNoteCreationResponse(result);
      assert.strictEqual(result.type, 'general', 'Should default to general type');
    });

    test('should create note in specified type', async () => {
      const response = await mcpClient.callTool('create_note', {
        type: 'projects',
        title: 'Project Note via MCP',
        content: 'This is a project note created via MCP.'
      });

      const result = JSON.parse(response.content[0].text);
      IntegrationTestAssertions.assertNoteCreationResponse(result);
      assert.strictEqual(result.type, 'projects', 'Should use specified type');
    });

    test('should create note type and then create note', async () => {
      // Create new note type
      const typeResponse = await mcpClient.callTool('create_note_type', {
        name: 'test-type',
        description: 'Test note type created via MCP',
        agent_instructions: ['Test instruction 1', 'Test instruction 2']
      });

      const typeResult = JSON.parse(typeResponse.content[0].text);
      assert.ok(typeResult.success, 'Note type creation should succeed');
      assert.strictEqual(typeResult.name, 'test-type', 'Should have correct name');

      // Create note in new type
      const noteResponse = await mcpClient.callTool('create_note', {
        type: 'test-type',
        title: 'Note in Custom Type',
        content: 'This note is in a custom type.'
      });

      const noteResult = JSON.parse(noteResponse.content[0].text);
      IntegrationTestAssertions.assertNoteCreationResponse(noteResult);
      assert.strictEqual(noteResult.type, 'test-type', 'Should use custom type');
    });

    test('should get note content', async () => {
      // First create a note
      const createResponse = await mcpClient.callTool('create_note', {
        title: 'Retrievable Note',
        content: 'This content should be retrievable.'
      });

      const createResult = JSON.parse(createResponse.content[0].text);

      // Then retrieve it
      const getResponse = await mcpClient.callTool('get_note', {
        id: createResult.id
      });

      const getResult = JSON.parse(getResponse.content[0].text);
      assert.strictEqual(
        getResult.title,
        'Retrievable Note',
        'Should retrieve correct title'
      );
      assert.ok(
        getResult.content.includes('retrievable'),
        'Should retrieve correct content'
      );
    });

    test('should update existing note', async () => {
      // Create a note
      const createResponse = await mcpClient.callTool('create_note', {
        title: 'Original Title',
        content: 'Original content'
      });

      const createResult = JSON.parse(createResponse.content[0].text);

      // Update the note
      const updateResponse = await mcpClient.callTool('update_note', {
        id: createResult.id,
        content: 'Updated content with new information'
      });

      const updateResult = JSON.parse(updateResponse.content[0].text);
      assert.ok(updateResult.success, 'Update should succeed');

      // Verify the update
      const getResponse = await mcpClient.callTool('get_note', {
        id: createResult.id
      });

      const getResult = JSON.parse(getResponse.content[0].text);
      assert.ok(
        getResult.content.includes('Updated content'),
        'Should have updated content'
      );
    });

    test('should delete note', async () => {
      // Create a note
      const createResponse = await mcpClient.callTool('create_note', {
        title: 'Note to Delete',
        content: 'This note will be deleted'
      });

      const createResult = JSON.parse(createResponse.content[0].text);

      // Delete the note
      const deleteResponse = await mcpClient.callTool('delete_note', {
        id: createResult.id
      });

      const deleteResult = JSON.parse(deleteResponse.content[0].text);
      assert.ok(deleteResult.success, 'Delete should succeed');

      // Verify note is gone
      try {
        await mcpClient.callTool('get_note', { id: createResult.id });
        assert.fail('Should not be able to get deleted note');
      } catch (error) {
        assert.ok(error.message.includes('not found'), 'Should get not found error');
      }
    });
  });

  describe('Note Type Management', () => {
    test('should get comprehensive note type information', async () => {
      const response = await mcpClient.callTool('get_note_type_info', {
        name: 'book-reviews'
      });

      const result = JSON.parse(response.content[0].text);
      assert.strictEqual(result.name, 'book-reviews', 'Should have correct name');
      assert.ok(result.description, 'Should have description');
      assert.ok(result.hasTemplate, 'Should indicate template availability');
      assert.ok(
        Array.isArray(result.agentInstructions),
        'Should have agent instructions'
      );
      assert.ok(result.agentInstructions.length > 0, 'Should have some instructions');
    });

    test('should get info for note type without template', async () => {
      const response = await mcpClient.callTool('get_note_type_info', {
        name: 'general'
      });

      const result = JSON.parse(response.content[0].text);
      assert.strictEqual(result.name, 'general', 'Should have correct name');
      assert.strictEqual(result.hasTemplate, false, 'Should not have template');
    });

    test('should update note type agent instructions', async () => {
      const newInstructions = [
        'Updated instruction 1',
        'Updated instruction 2',
        'New instruction 3'
      ];

      const response = await mcpClient.callTool('update_note_type', {
        name: 'projects',
        field: 'agent_instructions',
        value: newInstructions
      });

      const result = JSON.parse(response.content[0].text);
      assert.ok(result.success, 'Update should succeed');

      // Verify the update
      const infoResponse = await mcpClient.callTool('get_note_type_info', {
        name: 'projects'
      });

      const infoResult = JSON.parse(infoResponse.content[0].text);
      assert.deepStrictEqual(
        infoResult.agentInstructions,
        newInstructions,
        'Instructions should be updated'
      );
    });

    test('should update note type description', async () => {
      const newDescription = 'Updated description for projects note type';

      const response = await mcpClient.callTool('update_note_type', {
        name: 'projects',
        field: 'description',
        value: newDescription
      });

      const result = JSON.parse(response.content[0].text);
      assert.ok(result.success, 'Update should succeed');

      // Verify the update
      const infoResponse = await mcpClient.callTool('get_note_type_info', {
        name: 'projects'
      });

      const infoResult = JSON.parse(infoResponse.content[0].text);
      assert.ok(
        infoResult.description.includes('Updated description'),
        'Description should be updated'
      );
    });

    test('should include agent instructions in note creation', async () => {
      // Create note type with specific instructions
      await mcpClient.callTool('create_note_type', {
        name: 'instructed-type',
        description: 'Type with specific instructions',
        agent_instructions: [
          'Always include a summary section',
          'Use bullet points for key information',
          'Add relevant tags'
        ]
      });

      // Create note in this type
      const response = await mcpClient.callTool('create_note', {
        type: 'instructed-type',
        title: 'Note with Instructions',
        content: 'Basic content'
      });

      const result = JSON.parse(response.content[0].text);
      assert.ok(result.agentInstructions, 'Should include agent instructions');
      assert.ok(Array.isArray(result.agentInstructions), 'Should be array');
      assert.ok(result.agentInstructions.length > 0, 'Should have instructions');
      assert.ok(
        result.agentInstructions.some((inst: string) => inst.includes('summary section')),
        'Should include specific instruction'
      );
    });

    test('should filter out empty instruction strings', async () => {
      const instructions = [
        'Valid instruction 1',
        '',
        'Valid instruction 2',
        '   ',
        'Valid instruction 3'
      ];

      await mcpClient.callTool('update_note_type', {
        name: 'projects',
        field: 'agent_instructions',
        value: instructions
      });

      const infoResponse = await mcpClient.callTool('get_note_type_info', {
        name: 'projects'
      });

      const result = JSON.parse(infoResponse.content[0].text);
      assert.strictEqual(
        result.agentInstructions.length,
        3,
        'Should filter out empty instructions'
      );
      assert.ok(
        !result.agentInstructions.includes(''),
        'Should not include empty strings'
      );
    });
  });

  describe('Link Management', () => {
    test('should create bidirectional link between notes', async () => {
      // Create two notes
      const note1Response = await mcpClient.callTool('create_note', {
        title: 'Source Note',
        content: 'This is the source note for linking.'
      });

      const note2Response = await mcpClient.callTool('create_note', {
        title: 'Target Note',
        content: 'This is the target note for linking.'
      });

      const note1 = JSON.parse(note1Response.content[0].text);
      const note2 = JSON.parse(note2Response.content[0].text);

      // Create link
      const linkResponse = await mcpClient.callTool('link_notes', {
        source: note1.id,
        target: note2.id,
        relationship: 'references',
        bidirectional: true
      });

      const linkResult = JSON.parse(linkResponse.content[0].text);
      IntegrationTestAssertions.assertLinkCreationResponse(linkResult);
      assert.strictEqual(
        linkResult.relationship,
        'references',
        'Should have correct relationship'
      );
    });

    test('should create unidirectional link', async () => {
      // Create two notes
      const note1Response = await mcpClient.callTool('create_note', {
        title: 'Referencing Note',
        content: 'This note references another.'
      });

      const note2Response = await mcpClient.callTool('create_note', {
        title: 'Referenced Note',
        content: 'This note is referenced by another.'
      });

      const note1 = JSON.parse(note1Response.content[0].text);
      const note2 = JSON.parse(note2Response.content[0].text);

      // Create unidirectional link
      const linkResponse = await mcpClient.callTool('link_notes', {
        source: note1.id,
        target: note2.id,
        relationship: 'mentions',
        bidirectional: false
      });

      const linkResult = JSON.parse(linkResponse.content[0].text);
      IntegrationTestAssertions.assertLinkCreationResponse(linkResult);
      assert.strictEqual(
        linkResult.relationship,
        'mentions',
        'Should have correct relationship'
      );
    });

    test('should prevent duplicate links', async () => {
      // Create two notes
      const note1Response = await mcpClient.callTool('create_note', {
        title: 'First Note',
        content: 'First note content'
      });

      const note2Response = await mcpClient.callTool('create_note', {
        title: 'Second Note',
        content: 'Second note content'
      });

      const note1 = JSON.parse(note1Response.content[0].text);
      const note2 = JSON.parse(note2Response.content[0].text);

      // Create first link
      const link1Response = await mcpClient.callTool('link_notes', {
        source: note1.id,
        target: note2.id,
        relationship: 'references',
        bidirectional: true
      });

      const link1Result = JSON.parse(link1Response.content[0].text);
      assert.ok(link1Result.success, 'First link should succeed');

      // Try to create duplicate link
      const link2Response = await mcpClient.callTool('link_notes', {
        source: note1.id,
        target: note2.id,
        relationship: 'references',
        bidirectional: true
      });

      const link2Result = JSON.parse(link2Response.content[0].text);
      assert.ok(!link2Result.success, 'Duplicate link should fail');
      assert.ok(
        link2Result.message.includes('already exists'),
        'Should indicate link already exists'
      );
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple simultaneous note creations', async () => {
      const promises = [];
      const noteCount = 5;

      // Create multiple notes concurrently
      for (let i = 0; i < noteCount; i++) {
        promises.push(
          mcpClient.callTool('create_note', {
            title: `Concurrent Note ${i}`,
            content: `Content for concurrent note ${i}`
          })
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      for (let i = 0; i < responses.length; i++) {
        const result = JSON.parse(responses[i].content[0].text);
        IntegrationTestAssertions.assertNoteCreationResponse(result);
        assert.ok(
          result.title.includes(`${i}`),
          `Should have correct title for note ${i}`
        );
      }
    });

    test('should handle mixed concurrent operations', async () => {
      // Create a note first
      const initialResponse = await mcpClient.callTool('create_note', {
        title: 'Initial Note',
        content: 'Initial content'
      });

      const initialNote = JSON.parse(initialResponse.content[0].text);

      // Run mixed operations concurrently
      const operations = [
        mcpClient.callTool('create_note', {
          title: 'New Note 1',
          content: 'New content 1'
        }),
        mcpClient.callTool('update_note', {
          id: initialNote.id,
          content: 'Updated content'
        }),
        mcpClient.callTool('search_notes', {
          query: 'content',
          limit: 10
        }),
        mcpClient.callTool('create_note', {
          title: 'New Note 2',
          content: 'New content 2'
        })
      ];

      const results = await Promise.all(operations);

      // All operations should succeed
      for (const result of results) {
        assert.ok(result.content, 'All operations should return content');
      }

      // Verify specific results
      const createResult1 = JSON.parse(results[0].content[0].text);
      IntegrationTestAssertions.assertNoteCreationResponse(createResult1);

      const updateResult = JSON.parse(results[1].content[0].text);
      assert.ok(updateResult.success, 'Update should succeed');

      const searchResult = JSON.parse(results[2].content[0].text);
      assert.ok(Array.isArray(searchResult), 'Search should return array');

      const createResult2 = JSON.parse(results[3].content[0].text);
      IntegrationTestAssertions.assertNoteCreationResponse(createResult2);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid tool calls', async () => {
      try {
        await mcpClient.callTool('nonexistent_tool', {});
        assert.fail('Should throw error for invalid tool');
      } catch (error) {
        assert.ok(error.message.includes('Unknown tool'), 'Should indicate unknown tool');
      }
    });

    test('should handle invalid note type creation', async () => {
      try {
        await mcpClient.callTool('create_note_type', {
          name: 'invalid/name',
          description: 'Invalid name'
        });
        assert.fail('Should throw error for invalid note type name');
      } catch (error) {
        assert.ok(error.message.includes('Invalid'), 'Should indicate invalid name');
      }
    });

    test('should handle nonexistent note retrieval', async () => {
      try {
        await mcpClient.callTool('get_note', {
          id: 'nonexistent/note.md'
        });
        assert.fail('Should throw error for nonexistent note');
      } catch (error) {
        assert.ok(error.message.includes('not found'), 'Should indicate note not found');
      }
    });

    test('should handle invalid resource URIs', async () => {
      try {
        await mcpClient.sendRequest('resources/read', {
          uri: 'jade-note://invalid/resource'
        });
        assert.fail('Should throw error for invalid resource');
      } catch (error) {
        assert.ok(
          error.message.includes('Unknown resource'),
          'Should indicate unknown resource'
        );
      }
    });

    test('should handle missing required parameters', async () => {
      try {
        await mcpClient.callTool('create_note', {
          content: 'Missing title'
        });
        assert.fail('Should throw error for missing title');
      } catch (error) {
        assert.ok(error.message.includes('title'), 'Should indicate missing title');
      }
    });

    test('should handle invalid link parameters', async () => {
      try {
        await mcpClient.callTool('link_notes', {
          source: 'nonexistent/note.md',
          target: 'another/nonexistent.md',
          relationship: 'invalid-relationship'
        });
        assert.fail('Should throw error for invalid link');
      } catch (error) {
        assert.ok(
          error.message.includes('not found') || error.message.includes('invalid'),
          'Should indicate link creation error'
        );
      }
    });
  });
});
