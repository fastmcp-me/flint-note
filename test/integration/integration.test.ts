/**
 * Integration Tests for jade-note MCP Server
 *
 * These tests start the actual MCP server process and communicate with it
 * using the MCP protocol to test the full end-to-end functionality.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

class MCPClient {
  #process: ChildProcess;
  #requestId = 1;
  #pendingRequests = new Map<
    number | string,
    {
      resolve: (response: MCPResponse) => void;
      reject: (error: Error) => void;
    }
  >();
  #responseBuffer = '';

  constructor(serverProcess: ChildProcess) {
    this.#process = serverProcess;
    this.#setupResponseHandler();
  }

  #setupResponseHandler(): void {
    if (!this.#process.stdout) {
      throw new Error('Server process stdout not available');
    }

    this.#process.stdout.on('data', (data: Buffer) => {
      this.#responseBuffer += data.toString();
      this.#processMessages();
    });
  }

  #processMessages(): void {
    const lines = this.#responseBuffer.split('\n');
    this.#responseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.#handleMessage(message);
        } catch (error) {
          console.error('Failed to parse MCP message:', line, error);
        }
      }
    }
  }

  #handleMessage(message: MCPResponse | MCPNotification): void {
    if ('id' in message) {
      // This is a response
      const pending = this.#pendingRequests.get(message.id);
      if (pending) {
        this.#pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(`MCP Error: ${message.error.message}`));
        } else {
          pending.resolve(message);
        }
      }
    }
    // Notifications would be handled here if needed
  }

  async sendRequest(method: string, params?: unknown): Promise<any> {
    const id = this.#requestId++;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.#pendingRequests.set(id, { resolve, reject });

      const message = JSON.stringify(request) + '\n';
      if (!this.#process.stdin) {
        reject(new Error('Server process stdin not available'));
        return;
      }

      this.#process.stdin.write(message);

      // Set a timeout for the request
      setTimeout(() => {
        if (this.#pendingRequests.has(id)) {
          this.#pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000); // 10 second timeout
    });
  }

  async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {}
      },
      clientInfo: {
        name: 'jade-note-test-client',
        version: '1.0.0'
      }
    });

    assert.ok(response.result);
    assert.ok(response.result.capabilities);

    // Send initialized notification
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    };

    if (this.#process.stdin) {
      this.#process.stdin.write(JSON.stringify(notification) + '\n');
    }
  }

  async close(): Promise<void> {
    this.#process.kill('SIGTERM');

    return new Promise(resolve => {
      this.#process.on('exit', () => resolve());

      // Force kill if not closed within 5 seconds
      setTimeout(() => {
        this.#process.kill('SIGKILL');
        resolve();
      }, 5000);
    });
  }
}

describe('MCP Server Integration Tests', () => {
  let testWorkspaceRoot: string;
  let serverProcess: ChildProcess;
  let client: MCPClient;

  beforeEach(async () => {
    // Create a unique temporary workspace
    testWorkspaceRoot = path.join(
      tmpdir(),
      `jade-note-integration-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await fs.mkdir(testWorkspaceRoot, { recursive: true });

    // Start the server process
    serverProcess = spawn('node', ['src/server.ts'], {
      cwd: path.resolve('./'),
      env: {
        ...process.env,
        JADE_NOTE_WORKSPACE: testWorkspaceRoot
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle server errors
    serverProcess.stderr?.on('data', data => {
      const output = data.toString();
      // Filter out expected initialization messages
      if (
        !output.includes('initialized successfully') &&
        !output.includes('ExperimentalWarning')
      ) {
        console.error('Server stderr:', output);
      }
    });

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      const initTimeout: NodeJS.Timeout = setTimeout(() => {
        serverProcess.stderr?.off('data', checkInit);
        reject(new Error('Server initialization timeout'));
      }, 10000);

      const checkInit = (data: Buffer) => {
        if (data.toString().includes('initialized successfully')) {
          clearTimeout(initTimeout);
          serverProcess.stderr?.off('data', checkInit);
          resolve();
        }
      };

      serverProcess.stderr?.on('data', checkInit);

      serverProcess.on('error', error => {
        clearTimeout(initTimeout);
        reject(error);
      });
    });

    // Create MCP client
    client = new MCPClient(serverProcess);
    await client.initialize();
  });

  afterEach(async () => {
    // Clean up client and server
    if (client) {
      await client.close();
    }

    // Clean up test workspace
    try {
      await fs.rm(testWorkspaceRoot, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('Server Initialization', () => {
    test('should initialize and respond to capabilities', async () => {
      const response = await client.sendRequest('tools/list');

      assert.ok(response.result);
      assert.ok(response.result.tools);
      assert.ok(Array.isArray(response.result.tools));

      // Check for expected tools
      const toolNames = response.result.tools.map((tool: { name: string }) => tool.name);
      assert.ok(toolNames.includes('create_note_type'));
      assert.ok(toolNames.includes('create_note'));
      assert.ok(toolNames.includes('get_note'));
      assert.ok(toolNames.includes('update_note'));
      assert.ok(toolNames.includes('search_notes'));
      assert.ok(toolNames.includes('list_note_types'));
    });

    test('should list available resources', async () => {
      const response = await client.sendRequest('resources/list');

      assert.ok(response.result);
      assert.ok(response.result.resources);
      assert.ok(Array.isArray(response.result.resources));

      // Check for expected resources
      const resourceUris = response.result.resources.map(
        (resource: { uri: string }) => resource.uri
      );
      assert.ok(resourceUris.includes('jade-note://types'));
      assert.ok(resourceUris.includes('jade-note://recent'));
      assert.ok(resourceUris.includes('jade-note://stats'));
    });
  });

  describe('Note Creation Workflow', () => {
    test('should create note type and then create a note', async () => {
      // Step 1: Create a custom note type
      const createTypeResponse = await client.sendRequest('tools/call', {
        name: 'create_note_type',
        arguments: {
          type_name: 'meeting-notes',
          description: 'Notes from team meetings',
          template: '# Meeting Notes\n\n## Attendees\n\n## Agenda\n\n## Action Items\n'
        }
      });

      assert.ok(createTypeResponse.result);
      assert.ok(createTypeResponse.result.content);
      assert.strictEqual(createTypeResponse.result.content[0].type, 'text');

      const createTypeResult = JSON.parse(createTypeResponse.result.content[0].text);
      assert.ok(createTypeResult.success);
      assert.ok(createTypeResult.message.includes('Created note type'));
      assert.ok(createTypeResult.message.includes('successfully'));
      assert.strictEqual(createTypeResult.type_name, 'meeting-notes');

      // Step 2: Create a note of that type
      const createNoteResponse = await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'meeting-notes',
          title: 'Weekly Standup',
          content: 'Discussed project progress and upcoming milestones.'
        }
      });

      assert.ok(createNoteResponse.result);
      assert.ok(createNoteResponse.result.content);
      assert.strictEqual(createNoteResponse.result.content[0].type, 'text');

      const noteInfo = JSON.parse(createNoteResponse.result.content[0].text);
      assert.strictEqual(noteInfo.type, 'meeting-notes');
      assert.strictEqual(noteInfo.title, 'Weekly Standup');
      assert.ok(noteInfo.id);
      assert.ok(noteInfo.filename);

      // Step 3: Retrieve the created note
      const getNoteResponse = await client.sendRequest('tools/call', {
        name: 'get_note',
        arguments: {
          identifier: noteInfo.id
        }
      });

      assert.ok(getNoteResponse.result);
      const retrievedNote = JSON.parse(getNoteResponse.result.content[0].text);
      assert.strictEqual(retrievedNote.title, 'Weekly Standup');
      assert.strictEqual(retrievedNote.type, 'meeting-notes');
      assert.ok(retrievedNote.content.includes('Discussed project progress'));
    });

    test('should handle note creation in default type', async () => {
      const response = await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'general',
          title: 'Quick Thought',
          content: 'This is a quick note in the general category.'
        }
      });

      assert.ok(response.result);
      const noteInfo = JSON.parse(response.result.content[0].text);
      assert.strictEqual(noteInfo.type, 'general');
      assert.strictEqual(noteInfo.title, 'Quick Thought');
      assert.strictEqual(noteInfo.filename, 'quick-thought.md');
    });
  });

  describe('Note Management Operations', () => {
    let noteId: string;

    beforeEach(async () => {
      // Create a test note for each test
      const response = await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'general',
          title: 'Test Note for Updates',
          content: 'Original content of the test note.'
        }
      });

      const noteInfo = JSON.parse(response.result.content[0].text);
      noteId = noteInfo.id;
    });

    test('should update existing note', async () => {
      const updateResponse = await client.sendRequest('tools/call', {
        name: 'update_note',
        arguments: {
          identifier: noteId,
          content: '# Test Note for Updates\n\nUpdated content with more details.'
        }
      });

      assert.ok(updateResponse.result);
      const updateResult = JSON.parse(updateResponse.result.content[0].text);
      assert.strictEqual(updateResult.updated, true);

      // Verify the update by retrieving the note
      const getResponse = await client.sendRequest('tools/call', {
        name: 'get_note',
        arguments: { identifier: noteId }
      });

      const retrievedNote = JSON.parse(getResponse.result.content[0].text);
      assert.ok(retrievedNote.content.includes('Updated content with more details'));
    });

    test('should search for notes', async () => {
      // Create additional notes for searching
      await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'general',
          title: 'JavaScript Tutorial',
          content: 'Learning about JavaScript functions and closures.'
        }
      });

      await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'general',
          title: 'Python Guide',
          content: 'Python programming best practices and patterns.'
        }
      });

      // Search for notes containing "JavaScript"
      const searchResponse = await client.sendRequest('tools/call', {
        name: 'search_notes',
        arguments: {
          query: 'JavaScript',
          limit: 10
        }
      });

      assert.ok(searchResponse.result);
      const searchResults = JSON.parse(searchResponse.result.content[0].text);
      assert.ok(Array.isArray(searchResults));
      assert.ok(searchResults.length > 0);

      const jsNote = searchResults.find(
        (note: { title: string; content: string }) =>
          note.title.includes('JavaScript') || note.content.includes('JavaScript')
      );
      assert.ok(jsNote);
    });
  });

  describe('Resource Access', () => {
    test('should read workspace statistics', async () => {
      // Create some notes first
      await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'general',
          title: 'Stats Test Note 1',
          content: 'Content for stats testing.'
        }
      });

      await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'general',
          title: 'Stats Test Note 2',
          content: 'More content for stats testing.'
        }
      });

      const response = await client.sendRequest('resources/read', {
        uri: 'jade-note://stats'
      });

      assert.ok(response.result);
      assert.ok(response.result.contents);
      assert.ok(response.result.contents.length > 0);

      const stats = JSON.parse(response.result.contents[0].text);
      assert.ok(stats.workspace_root);
      assert.ok(typeof stats.note_types === 'number');
      assert.ok(typeof stats.total_notes === 'number');
      assert.ok(stats.total_notes >= 2); // At least the notes we created
    });

    test('should read available note types', async () => {
      // Create a custom note type
      await client.sendRequest('tools/call', {
        name: 'create_note_type',
        arguments: {
          type_name: 'project-notes',
          description: 'Notes related to specific projects'
        }
      });

      const response = await client.sendRequest('resources/read', {
        uri: 'jade-note://types'
      });

      assert.ok(response.result);
      const types = JSON.parse(response.result.contents[0].text);
      assert.ok(Array.isArray(types));

      const typeNames = types.map((type: { name: string }) => type.name);
      assert.ok(typeNames.includes('general'));
      assert.ok(typeNames.includes('project-notes'));
    });

    test('should read recent notes', async () => {
      // Create some notes
      await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'general',
          title: 'Recent Note 1',
          content: 'This is a recent note.'
        }
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'general',
          title: 'Recent Note 2',
          content: 'This is another recent note.'
        }
      });

      const response = await client.sendRequest('resources/read', {
        uri: 'jade-note://recent'
      });

      assert.ok(response.result);
      const recentNotes = JSON.parse(response.result.contents[0].text);
      assert.ok(Array.isArray(recentNotes));
      assert.ok(recentNotes.length >= 2);

      // Check that notes are sorted by modification time (newest first)
      if (recentNotes.length >= 2) {
        const firstNote = new Date(recentNotes[0].modified);
        const secondNote = new Date(recentNotes[1].modified);
        assert.ok(firstNote >= secondNote);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid tool calls', async () => {
      const response = await client.sendRequest('tools/call', {
        name: 'nonexistent_tool',
        arguments: {}
      });

      assert.ok(response.result);
      assert.ok(response.result.isError);
      assert.ok(response.result.content);
      assert.ok(response.result.content[0]);
      assert.ok(response.result.content[0].text.includes('Unknown tool'));
    });

    test('should handle invalid note type creation', async () => {
      try {
        await client.sendRequest('tools/call', {
          name: 'create_note_type',
          arguments: {
            type_name: 'invalid/type/name',
            description: 'This should fail'
          }
        });
        assert.fail('Should have thrown an error for invalid type name');
      } catch (error) {
        assert.ok(error instanceof Error);
      }
    });

    test('should handle nonexistent note retrieval', async () => {
      const response = await client.sendRequest('tools/call', {
        name: 'get_note',
        arguments: {
          identifier: 'nonexistent/note.md'
        }
      });

      assert.ok(response.result);
      assert.ok(response.result.isError);
      assert.ok(response.result.content);
      assert.ok(response.result.content[0]);
      assert.ok(response.result.content[0].text.includes('does not exist'));
    });

    test('should handle invalid resource URIs', async () => {
      try {
        await client.sendRequest('resources/read', {
          uri: 'jade-note://invalid-resource'
        });
        assert.fail('Should have thrown an error for invalid resource');
      } catch (error) {
        assert.ok(error instanceof Error);
      }
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple simultaneous note creations', async () => {
      const promises = [
        client.sendRequest('tools/call', {
          name: 'create_note',
          arguments: {
            type: 'general',
            title: 'Concurrent Note 1',
            content: 'Content for concurrent note 1.'
          }
        }),
        client.sendRequest('tools/call', {
          name: 'create_note',
          arguments: {
            type: 'general',
            title: 'Concurrent Note 2',
            content: 'Content for concurrent note 2.'
          }
        }),
        client.sendRequest('tools/call', {
          name: 'create_note',
          arguments: {
            type: 'general',
            title: 'Concurrent Note 3',
            content: 'Content for concurrent note 3.'
          }
        })
      ];

      const results = await Promise.all(promises);

      assert.strictEqual(results.length, 3);
      for (const result of results) {
        assert.ok(result.result);
        const noteInfo = JSON.parse(result.result.content[0].text);
        assert.ok(noteInfo.id);
        assert.ok(noteInfo.title.startsWith('Concurrent Note'));
      }
    });

    test('should handle mixed concurrent operations', async () => {
      // First create a note to update
      const createResponse = await client.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          type: 'general',
          title: 'Mixed Ops Note',
          content: 'Original content.'
        }
      });
      const noteInfo = JSON.parse(createResponse.result.content[0].text);

      // Now perform mixed operations concurrently
      const promises = [
        client.sendRequest('tools/call', {
          name: 'create_note',
          arguments: {
            type: 'general',
            title: 'New Note During Mixed Ops',
            content: 'New note content.'
          }
        }),
        client.sendRequest('tools/call', {
          name: 'get_note',
          arguments: { identifier: noteInfo.id }
        }),
        client.sendRequest('tools/call', {
          name: 'update_note',
          arguments: {
            identifier: noteInfo.id,
            content: '# Mixed Ops Note\n\nUpdated content during mixed operations.'
          }
        }),
        client.sendRequest('tools/call', {
          name: 'search_notes',
          arguments: { query: 'Mixed', limit: 5 }
        })
      ];

      const results = await Promise.all(promises);

      assert.strictEqual(results.length, 4);
      for (const result of results) {
        assert.ok(result.result);
      }
    });
  });
});
