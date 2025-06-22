import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { spawn, ChildProcess } from 'node:child_process';

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

  async sendRequest(method: string, params?: unknown): Promise<MCPResponse> {
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
    assert.ok((response.result as any).capabilities);

    // Send initialized notification
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    };

    if (this.#process.stdin) {
      this.#process.stdin.write(JSON.stringify(notification) + '\n');
    }
  }

  async callTool(
    toolName: string,
    args: unknown
  ): Promise<{
    success: boolean;
    content: Array<{ type: string; text: string }>;
    isError: boolean;
  }> {
    const response = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args
    });

    if (response.result) {
      // Check if the tool returned an error result
      const result = response.result as any;
      const isToolError = result.isError === true;
      return {
        success: !isToolError,
        content: result.content,
        isError: isToolError
      };
    } else {
      return {
        success: false,
        content: [{ type: 'text', text: response.error?.message || 'Unknown error' }],
        isError: true
      };
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

describe('Note Type Management', () => {
  let tempDir: string;
  let serverProcess: ChildProcess;
  let client: MCPClient;

  before(async () => {
    // Create temporary directory for test workspace
    tempDir = await mkdtemp(path.join(tmpdir(), 'jade-note-test-'));

    // Start the MCP server
    serverProcess = spawn('node', ['src/server.ts'], {
      cwd: path.resolve('./'),
      env: {
        ...process.env,
        JADE_NOTE_WORKSPACE: tempDir
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle server errors
    serverProcess.stderr?.on('data', data => {
      const output = data.toString();
      if (
        !output.includes('initialized successfully') &&
        !output.includes('ExperimentalWarning')
      ) {
        console.error('Server stderr:', output);
      }
    });

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      const initTimeout = setTimeout(() => {
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

  after(async () => {
    // Clean up
    if (client) {
      await client.close();
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Note Type Information Retrieval', () => {
    it('should get comprehensive note type information', async () => {
      // First create a note type
      const createResult = await client.callTool('create_note_type', {
        type_name: 'reading',
        description: 'Notes for tracking books and articles',
        template:
          '# {{title}}\n\n**Author:** {{author}}\n\n## Summary\n\n## Key Insights\n\n## Rating\n\n'
      });

      assert.ok(createResult.success, 'Note type creation should succeed');

      // Get note type info
      const infoResult = await client.callTool('get_note_type_info', {
        type_name: 'reading'
      });

      assert.ok(infoResult.success, 'Should successfully get note type info');

      const info = JSON.parse(infoResult.content[0].text);
      assert.strictEqual(info.type_name, 'reading', 'Should return correct type name');
      assert.strictEqual(
        info.description,
        'Notes for tracking books and articles',
        'Should return correct description'
      );
      assert.ok(
        Array.isArray(info.agent_instructions),
        'Should return agent instructions as array'
      );
      assert.ok(
        info.agent_instructions.length > 0,
        'Should have default agent instructions'
      );
      assert.ok(info.template, 'Should return template');
      assert.strictEqual(info.has_template, true, 'Should indicate template exists');
      assert.ok(info.path, 'Should return path');
    });

    it('should get info for note type without template', async () => {
      // Create note type without template
      const createResult = await client.callTool('create_note_type', {
        type_name: 'ideas',
        description: 'Random thoughts and ideas'
      });

      assert.ok(createResult.success, 'Note type creation should succeed');

      // Get note type info
      const infoResult = await client.callTool('get_note_type_info', {
        type_name: 'ideas'
      });

      assert.ok(infoResult.success, 'Should successfully get note type info');

      const info = JSON.parse(infoResult.content[0].text);
      assert.strictEqual(info.type_name, 'ideas', 'Should return correct type name');
      assert.strictEqual(info.has_template, false, 'Should indicate no template');
      assert.strictEqual(info.template, null, 'Template should be null');
    });

    it('should handle non-existent note type', async () => {
      const infoResult = await client.callTool('get_note_type_info', {
        type_name: 'nonexistent'
      });

      assert.ok(infoResult.isError, 'Should return error for non-existent type');
      assert.ok(
        infoResult.content[0].text.includes('does not exist'),
        'Should indicate type does not exist'
      );
    });
  });

  describe('Note Type Updates', () => {
    it('should update agent instructions', async () => {
      // Create note type
      await client.callTool('create_note_type', {
        type_name: 'projects',
        description: 'Project planning and tracking'
      });

      // Update instructions
      const updateResult = await client.callTool('update_note_type', {
        type_name: 'projects',
        field: 'instructions',
        value:
          '- Always ask about project goals\n- Extract action items\n- Suggest next steps\n- Track deadlines'
      });

      assert.ok(updateResult.success, 'Should successfully update instructions');

      const result = JSON.parse(updateResult.content[0].text);
      assert.strictEqual(result.success, true, 'Should indicate success');
      assert.strictEqual(
        result.field_updated,
        'instructions',
        'Should show instructions were updated'
      );
      assert.ok(
        Array.isArray(result.updated_info.agent_instructions),
        'Should return updated instructions'
      );
      assert.ok(
        result.updated_info.agent_instructions.length > 0,
        'Should have instructions'
      );

      // Verify instructions were actually updated
      const infoResult = await client.callTool('get_note_type_info', {
        type_name: 'projects'
      });

      const info = JSON.parse(infoResult.content[0].text);
      assert.ok(
        info.agent_instructions.some((i: string) => i.includes('project goals')),
        'Should contain updated instruction'
      );
    });

    it('should update description', async () => {
      // Create note type
      await client.callTool('create_note_type', {
        type_name: 'research',
        description: 'Research notes'
      });

      // Update description
      const updateResult = await client.callTool('update_note_type', {
        type_name: 'research',
        field: 'description',
        value: 'Academic research notes and findings'
      });

      assert.ok(updateResult.success, 'Should successfully update description');

      // Verify description was updated
      const infoResult = await client.callTool('get_note_type_info', {
        type_name: 'research'
      });

      const info = JSON.parse(infoResult.content[0].text);
      assert.strictEqual(
        info.description,
        'Academic research notes and findings',
        'Should have updated description'
      );
    });

    it('should update template', async () => {
      // Create note type
      await client.callTool('create_note_type', {
        type_name: 'meetings',
        description: 'Meeting notes and minutes'
      });

      // Update template
      const newTemplate =
        '# {{title}}\n\n**Date:** {{date}}\n**Attendees:** \n\n## Agenda\n\n## Discussion\n\n## Action Items\n\n';
      const updateResult = await client.callTool('update_note_type', {
        type_name: 'meetings',
        field: 'template',
        value: newTemplate
      });

      assert.ok(updateResult.success, 'Should successfully update template');

      // Verify template was updated
      const infoResult = await client.callTool('get_note_type_info', {
        type_name: 'meetings'
      });

      const info = JSON.parse(infoResult.content[0].text);
      assert.strictEqual(info.template, newTemplate, 'Should have updated template');
      assert.strictEqual(info.has_template, true, 'Should indicate template exists');
    });

    it('should handle invalid field type', async () => {
      // Create note type
      await client.callTool('create_note_type', {
        type_name: 'test',
        description: 'Test type'
      });

      // Try to update invalid field
      const updateResult = await client.callTool('update_note_type', {
        type_name: 'test',
        field: 'invalid_field',
        value: 'some value'
      });

      assert.ok(updateResult.isError, 'Should return error for invalid field');
      assert.ok(
        updateResult.content[0].text.includes('Invalid field'),
        'Should indicate invalid field'
      );
    });

    it('should handle non-existent note type', async () => {
      const updateResult = await client.callTool('update_note_type', {
        type_name: 'nonexistent',
        field: 'description',
        value: 'new description'
      });

      assert.ok(updateResult.isError, 'Should return error for non-existent type');
      assert.ok(
        updateResult.content[0].text.includes('does not exist'),
        'Should indicate type does not exist'
      );
    });
  });

  describe('Note Creation with Agent Instructions', () => {
    it('should include agent instructions in create_note response', async () => {
      // Create note type with specific instructions
      await client.callTool('create_note_type', {
        type_name: 'journal',
        description: 'Daily journal entries'
      });

      // Update with specific instructions
      await client.callTool('update_note_type', {
        type_name: 'journal',
        field: 'instructions',
        value:
          '- Always ask about mood\n- Suggest reflection questions\n- Encourage gratitude practice'
      });

      // Create a note
      const createNoteResult = await client.callTool('create_note', {
        type: 'journal',
        title: 'Daily Entry',
        content: 'Today was a good day.'
      });

      assert.ok(createNoteResult.success, 'Should successfully create note');

      const result = JSON.parse(createNoteResult.content[0].text);
      assert.ok(
        Array.isArray(result.agent_instructions),
        'Should include agent instructions'
      );
      assert.ok(result.agent_instructions.length > 0, 'Should have instructions');
      assert.ok(
        result.agent_instructions.some((i: string) => i.includes('mood')),
        'Should contain specific instruction'
      );
      assert.ok(result.next_suggestions, 'Should include next suggestions');
      assert.ok(
        result.next_suggestions.includes('journal'),
        'Should reference note type in suggestions'
      );
    });

    it('should handle note creation when type info is not available', async () => {
      // Create note in default type (which should exist)
      const createNoteResult = await client.callTool('create_note', {
        type: 'general',
        title: 'Test Note',
        content: 'This is a test note.'
      });

      assert.ok(
        createNoteResult.success,
        'Should successfully create note even without type info'
      );

      const result = JSON.parse(createNoteResult.content[0].text);
      // Should still have the basic note info even if agent instructions aren't available
      assert.ok(result.id, 'Should have note ID');
      assert.ok(result.title, 'Should have note title');
    });
  });

  describe('Integration with Existing Tools', () => {
    it('should work with list_note_types', async () => {
      // Create a few note types
      await client.callTool('create_note_type', {
        type_name: 'books',
        description: 'Book reviews and notes'
      });

      await client.callTool('create_note_type', {
        type_name: 'articles',
        description: 'Article summaries'
      });

      // List note types
      const listResult = await client.callTool('list_note_types', {});
      assert.ok(listResult.success, 'Should successfully list note types');

      const types = JSON.parse(listResult.content[0].text);
      assert.ok(Array.isArray(types), 'Should return array of types');
      assert.ok(
        types.some((t: { name: string }) => t.name === 'books'),
        'Should include books type'
      );
      assert.ok(
        types.some((t: { name: string }) => t.name === 'articles'),
        'Should include articles type'
      );
    });

    it('should work with get_note_type_template', async () => {
      // Create note type with template
      await client.callTool('create_note_type', {
        type_name: 'reviews',
        description: 'Product and service reviews',
        template: '# {{title}}\n\n**Rating:** /5\n\n## Pros\n\n## Cons\n\n## Verdict\n\n'
      });

      // Get template
      const templateResult = await client.callTool('get_note_type_template', {
        type_name: 'reviews'
      });

      assert.ok(templateResult.success, 'Should successfully get template');

      const result = JSON.parse(templateResult.content[0].text);
      assert.strictEqual(result.type_name, 'reviews', 'Should return correct type name');
      assert.ok(result.template.includes('Rating'), 'Should return template content');
    });
  });
});
