/**
 * Link Notes Integration Tests
 *
 * Integration tests for the link_notes MCP server tool, testing the complete
 * flow from MCP client request to server response.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: MCPToolResult;
  error?: Record<string, unknown>;
}

interface LinkObject {
  target: string;
  relationship: string;
  context?: string;
  created?: string | Date;
}

interface NoteMetadata {
  links?: LinkObject[];
  [key: string]: unknown;
}

interface NoteObject {
  id: string;
  title: string;
  content: string;
  metadata: NoteMetadata;
  [key: string]: unknown;
}

interface MCPToolResult {
  isError?: boolean;
  success?: boolean;
  content?: Array<{ text: string }>;
  link_created?: {
    source: string;
    target: string;
    relationship: string;
    context?: string;
    timestamp: string;
    bidirectional?: boolean;
  };
  reverse_link_created?: boolean;
  [key: string]: unknown;
}

class MCPTestClient {
  private serverProcess: ChildProcess | null = null;
  private requestId = 1;
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  async start(): Promise<void> {
    const serverPath = path.join(__dirname, '..', 'src', 'server.ts');

    this.serverProcess = spawn('npx', ['tsx', serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        JADE_NOTE_WORKSPACE: this.workspacePath
      }
    });

    // Wait for server initialization
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);

      this.serverProcess!.stderr!.on('data', data => {
        const output = data.toString();
        if (output.includes('server initialized successfully')) {
          clearTimeout(timeout);
          resolve();
        }
        if (output.includes('Failed to initialize')) {
          clearTimeout(timeout);
          reject(new Error(`Server initialization failed: ${output}`));
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async sendRequest(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<MCPResponse> {
    if (!this.serverProcess) {
      throw new Error('Server not started');
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      let responseBuffer = '';

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout: ${method}`));
      }, 15000);

      const cleanup = () => {
        clearTimeout(timeout);
        this.serverProcess!.stdout!.removeListener('data', onData);
      };

      const onData = (chunk: Buffer) => {
        responseBuffer += chunk.toString();

        // Try to parse JSON responses line by line
        const lines = responseBuffer.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            try {
              const response = JSON.parse(line) as MCPResponse;
              if (response.id === request.id) {
                cleanup();
                resolve(response);
                return;
              }
            } catch (_e) {
              // Not a complete JSON response yet
            }
          }
        }
        responseBuffer = lines[lines.length - 1];
      };

      this.serverProcess!.stdout!.on('data', onData);
      this.serverProcess!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  async createNote(type: string, title: string, content: string): Promise<boolean> {
    const response = await this.sendRequest('tools/call', {
      name: 'create_note',
      arguments: { type, title, content }
    });

    return !!(response.result && !response.result.isError);
  }

  async getNote(identifier: string): Promise<NoteObject> {
    const response = await this.sendRequest('tools/call', {
      name: 'get_note',
      arguments: { identifier }
    });

    if (response.result && response.result.content) {
      return JSON.parse(response.result.content[0].text);
    }
    throw new Error('Failed to get note');
  }

  async linkNotes(args: {
    source: string;
    target: string;
    relationship?: string;
    bidirectional?: boolean;
    context?: string;
  }): Promise<MCPToolResult> {
    const response = await this.sendRequest('tools/call', {
      name: 'link_notes',
      arguments: args
    });

    if (response.result && response.result.isError) {
      throw new Error(response.result.content![0].text);
    }
    if (response.result && response.result.content) {
      return JSON.parse(response.result.content[0].text);
    }
    throw new Error('Failed to create link');
  }
}

describe('Link Notes MCP Integration', () => {
  let tempDir: string;
  let client: MCPTestClient;

  beforeEach(async () => {
    // Create temporary workspace
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jade-note-mcp-test-'));
    client = new MCPTestClient(tempDir);
    await client.start();

    // Create test notes
    await client.createNote(
      'general',
      'Project Plan',
      `# Project Plan

This document outlines our project strategy and timeline.

## Objectives
- Define clear goals
- Establish milestones
- Allocate resources

## Timeline
The project is scheduled for completion over 8 weeks.`
    );

    await client.createNote(
      'general',
      'Meeting Notes',
      `# Meeting Notes

Notes from the project kickoff meeting.

## Attendees
- Alice (PM)
- Bob (Dev)
- Carol (Design)

## Decisions
- Approved project timeline
- Assigned team roles
- Set weekly check-ins`
    );

    await client.createNote(
      'general',
      'Technical Spec',
      `# Technical Specification

Detailed technical requirements and architecture.

## Architecture
- Frontend: React + TypeScript
- Backend: Node.js
- Database: PostgreSQL

## Requirements
- Performance targets
- Security requirements
- Scalability goals`
    );
  });

  afterEach(async () => {
    await client.stop();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Link Creation', () => {
    test('should create bidirectional references link', async () => {
      const result = await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'references',
        bidirectional: true,
        context: 'Meeting discussed the project plan'
      });

      assert.ok(result.success, 'Link creation should succeed');
      assert.strictEqual(result.link_created!.source, 'general/meeting-notes.md');
      assert.strictEqual(result.link_created!.target, 'general/project-plan.md');
      assert.strictEqual(result.link_created!.relationship, 'references');
      assert.ok(result.link_created!.bidirectional, 'Should be bidirectional');
      assert.ok(result.reverse_link_created, 'Reverse link should be created');
      assert.ok(result.link_created!.timestamp, 'Should have timestamp');
    });

    test('should create unidirectional mentions link', async () => {
      const result = await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/technical-spec.md',
        relationship: 'mentions',
        bidirectional: false
      });

      assert.ok(result.success, 'Link creation should succeed');
      assert.strictEqual(result.link_created!.bidirectional, false);
      assert.strictEqual(
        result.reverse_link_created,
        false,
        'No reverse link should be created'
      );
    });

    test('should handle default parameters', async () => {
      const result = await client.linkNotes({
        source: 'general/technical-spec.md',
        target: 'general/project-plan.md'
      });

      assert.ok(result.success, 'Link creation with defaults should succeed');
      assert.strictEqual(
        result.link_created!.relationship,
        'references',
        'Should use default relationship'
      );
      assert.strictEqual(
        result.link_created!.bidirectional,
        true,
        'Should be bidirectional by default'
      );
    });
  });

  describe('Relationship Types', () => {
    const relationships = [
      'references',
      'follows-up',
      'contradicts',
      'supports',
      'mentions',
      'depends-on',
      'blocks',
      'related-to'
    ];

    relationships.forEach(relationship => {
      test(`should create "${relationship}" relationship`, async () => {
        const result = await client.linkNotes({
          source: 'general/technical-spec.md',
          target: 'general/project-plan.md',
          relationship,
          bidirectional: false
        });

        assert.ok(result.success, `${relationship} link should succeed`);
        assert.strictEqual(result.link_created!.relationship, relationship);
      });
    });

    test('should reject invalid relationship type', async () => {
      await assert.rejects(
        () =>
          client.linkNotes({
            source: 'general/technical-spec.md',
            target: 'general/project-plan.md',
            relationship: 'invalid-relationship'
          }),
        /Invalid relationship type/,
        'Should reject invalid relationship'
      );
    });
  });

  describe('Link Verification', () => {
    test('should store links in note metadata', async () => {
      await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'references',
        context: 'Test context'
      });

      const sourceNote = await client.getNote('general/meeting-notes.md');
      const targetNote = await client.getNote('general/project-plan.md');

      // Check source note links
      assert.ok(sourceNote.metadata.links, 'Source note should have links');
      assert.ok(Array.isArray(sourceNote.metadata.links), 'Links should be array');

      const sourceLink = sourceNote.metadata.links!.find(
        (l: LinkObject) => l.target === 'general/project-plan.md'
      );
      assert.ok(sourceLink, 'Source should have link to target');
      assert.strictEqual(sourceLink.relationship, 'references');
      assert.strictEqual(sourceLink.context, 'Test context');

      // Check target note reverse link
      assert.ok(targetNote.metadata.links, 'Target note should have reverse links');
      const reverseLink = targetNote.metadata.links!.find(
        (l: LinkObject) => l.target === 'general/meeting-notes.md'
      );
      assert.ok(reverseLink, 'Target should have reverse link');
      assert.strictEqual(reverseLink.relationship, 'mentions'); // references -> mentions
    });

    test('should add inline wikilinks to content', async () => {
      await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'references'
      });

      const sourceNote = await client.getNote('general/meeting-notes.md');

      assert.ok(
        (sourceNote.content as string).includes('[[project-plan|Project Plan]]'),
        'Should contain wikilink in content'
      );
    });

    test('should preserve existing note content and metadata', async () => {
      const originalNote = await client.getNote('general/meeting-notes.md');
      const originalContent = originalNote.content;
      const originalTitle = originalNote.title;

      await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'references'
      });

      const updatedNote = await client.getNote('general/meeting-notes.md');

      assert.strictEqual(updatedNote.title, originalTitle, 'Title should be preserved');
      assert.ok(
        updatedNote.content.includes(originalContent.trim()),
        'Original content should be preserved'
      );
    });
  });

  describe('Duplicate Link Prevention', () => {
    test('should prevent duplicate links with same relationship', async () => {
      // Create first link
      await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'references'
      });

      // Try to create duplicate
      await assert.rejects(
        () =>
          client.linkNotes({
            source: 'general/meeting-notes.md',
            target: 'general/project-plan.md',
            relationship: 'references'
          }),
        /Link already exists/,
        'Should prevent duplicate links'
      );
    });

    test('should allow different relationships between same notes', async () => {
      // Create first link
      await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'references',
        bidirectional: false
      });

      // Create second link with different relationship
      const result = await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'supports',
        bidirectional: false
      });

      assert.ok(result.success, 'Should allow different relationship');

      const sourceNote = await client.getNote('general/meeting-notes.md');
      const links = sourceNote.metadata.links || [];

      assert.strictEqual(links.length, 2, 'Should have two different links');
      assert.ok(links.some((l: LinkObject) => l.relationship === 'references'));
      assert.ok(links.some((l: LinkObject) => l.relationship === 'supports'));
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent source note', async () => {
      await assert.rejects(
        () =>
          client.linkNotes({
            source: 'general/non-existent.md',
            target: 'general/project-plan.md'
          }),
        /does not exist/,
        'Should reject non-existent source'
      );
    });

    test('should handle non-existent target note', async () => {
      await assert.rejects(
        () =>
          client.linkNotes({
            source: 'general/meeting-notes.md',
            target: 'general/non-existent.md'
          }),
        /does not exist/,
        'Should reject non-existent target'
      );
    });

    test('should validate required parameters', async () => {
      await assert.rejects(
        () =>
          client.linkNotes({
            source: '',
            target: 'general/project-plan.md'
          }),
        'Should reject empty source'
      );

      await assert.rejects(
        () =>
          client.linkNotes({
            source: 'general/meeting-notes.md',
            target: ''
          }),
        'Should reject empty target'
      );
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle multiple links from one note', async () => {
      // Create multiple links from same source
      await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'references'
      });

      await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/technical-spec.md',
        relationship: 'mentions'
      });

      const sourceNote = await client.getNote('general/meeting-notes.md');
      const links = sourceNote.metadata.links || [];

      assert.strictEqual(links.length, 2, 'Should have two links');
      assert.ok(links.some((l: LinkObject) => l.target === 'general/project-plan.md'));
      assert.ok(links.some((l: LinkObject) => l.target === 'general/technical-spec.md'));
    });

    test('should handle bidirectional link network', async () => {
      // Create a network of interconnected notes
      await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'references'
      });

      await client.linkNotes({
        source: 'general/project-plan.md',
        target: 'general/technical-spec.md',
        relationship: 'depends-on'
      });

      await client.linkNotes({
        source: 'general/technical-spec.md',
        target: 'general/meeting-notes.md',
        relationship: 'supports'
      });

      // Verify all notes have appropriate links
      const meetingNote = await client.getNote('general/meeting-notes.md');
      const projectNote = await client.getNote('general/project-plan.md');
      const techNote = await client.getNote('general/technical-spec.md');

      assert.ok(
        (meetingNote.metadata.links?.length ?? 0) >= 2,
        'Meeting note should have multiple links'
      );
      assert.ok(
        (projectNote.metadata.links?.length ?? 0) >= 2,
        'Project note should have multiple links'
      );
      assert.ok(
        (techNote.metadata.links?.length ?? 0) >= 2,
        'Tech note should have multiple links'
      );
    });

    test('should maintain link integrity across updates', async () => {
      // Create initial link
      await client.linkNotes({
        source: 'general/meeting-notes.md',
        target: 'general/project-plan.md',
        relationship: 'references'
      });

      // Update the source note content
      const updatedContent = `# Meeting Notes

Updated meeting notes with new information.

## New Section
Additional content added after linking.`;

      const updateResponse = await client.sendRequest('tools/call', {
        name: 'update_note',
        arguments: {
          identifier: 'general/meeting-notes.md',
          content: updatedContent
        }
      });

      assert.ok(updateResponse.result, 'Note update should succeed');

      // Verify links are still intact
      const updatedNote = await client.getNote('general/meeting-notes.md');
      assert.ok(updatedNote.metadata.links, 'Links should be preserved after update');
      assert.ok(
        updatedNote.content.includes('Additional content'),
        'New content should be present'
      );
    });
  });
});
