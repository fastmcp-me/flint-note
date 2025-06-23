/**
 * Shared integration test utilities
 *
 * Provides common MCP client, setup/teardown functions, and test data creators
 * for integration tests to reduce duplication and ensure consistency.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, ChildProcess } from 'node:child_process';
import { Workspace } from '../../../src/core/workspace.ts';
import { NoteManager } from '../../../src/core/notes.ts';
import { NoteTypeManager } from '../../../src/core/note-types.ts';
import { SearchManager } from '../../../src/core/search.ts';
import { LinkManager } from '../../../src/core/links.ts';
import { ConfigManager } from '../../../src/utils/config.ts';

/**
 * MCP protocol interfaces
 */
export interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPNotification {
  jsonrpc: string;
  method: string;
  params?: any;
}

/**
 * Integration test context containing all managers and workspace info
 */
export interface IntegrationTestContext {
  tempDir: string;
  workspace: Workspace;
  noteManager: NoteManager;
  noteTypeManager: NoteTypeManager;
  searchManager: SearchManager;
  linkManager: LinkManager;
  configManager: ConfigManager;
}

/**
 * Unified MCP client for integration testing
 */
export class MCPIntegrationClient {
  #process: ChildProcess | null = null;
  #requestId = 1;
  #pendingRequests = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      timeout?: NodeJS.Timeout;
    }
  >();
  #responseBuffer = '';
  #workspacePath: string;

  constructor(workspacePath: string) {
    this.#workspacePath = workspacePath;
  }

  async start(): Promise<void> {
    const serverPath = join(process.cwd(), 'src', 'server.ts');

    this.#process = spawn('node', [serverPath], {
      cwd: this.#workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    if (!this.#process.stdout || !this.#process.stdin || !this.#process.stderr) {
      throw new Error('Failed to create MCP server process streams');
    }

    this.#setupResponseHandler();
    await this.#waitForServer();
    await this.initialize();
  }

  async stop(): Promise<void> {
    if (this.#process) {
      // Clear pending requests
      for (const [id, request] of this.#pendingRequests) {
        if (request.timeout) {
          clearTimeout(request.timeout);
        }
        request.reject(new Error('MCP client shutting down'));
      }
      this.#pendingRequests.clear();

      this.#process.kill();
      this.#process = null;
    }
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.#process?.stdin) {
      throw new Error('MCP server not started');
    }

    const id = this.#requestId++;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      // Set timeout for request
      const timeout = setTimeout(() => {
        this.#pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, 10000);

      this.#pendingRequests.set(id, { resolve, reject, timeout });

      const requestLine = JSON.stringify(request) + '\n';
      this.#process!.stdin!.write(requestLine);
    });
  }

  async callTool(name: string, arguments_?: any): Promise<any> {
    return this.sendRequest('tools/call', {
      name,
      arguments: arguments_ || {}
    });
  }

  async initialize(): Promise<void> {
    const capabilities = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'jade-note-integration-test',
        version: '1.0.0'
      }
    });

    if (!capabilities.capabilities) {
      throw new Error('Failed to initialize MCP server');
    }

    await this.sendRequest('initialized');
  }

  #setupResponseHandler(): void {
    if (!this.#process?.stdout) return;

    this.#process.stdout.on('data', (data: Buffer) => {
      this.#responseBuffer += data.toString();
      this.#processMessages();
    });

    this.#process.stderr?.on('data', (data: Buffer) => {
      console.error('MCP Server Error:', data.toString());
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
      // Response
      const request = this.#pendingRequests.get(message.id);
      if (request) {
        if (request.timeout) {
          clearTimeout(request.timeout);
        }
        this.#pendingRequests.delete(message.id);

        if (message.error) {
          request.reject(new Error(`MCP Error: ${message.error.message}`));
        } else {
          request.resolve(message.result);
        }
      }
    }
    // Ignore notifications for now
  }

  async #waitForServer(): Promise<void> {
    // Simple delay to allow server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Creates a unique temporary directory name for integration tests
 */
export function createIntegrationTempDir(prefix = 'jade-note-integration'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return join(tmpdir(), `${prefix}-${timestamp}-${random}`);
}

/**
 * Creates and initializes an integration test context with all managers
 */
export async function createIntegrationTestContext(
  prefix?: string
): Promise<IntegrationTestContext> {
  const tempDir = createIntegrationTempDir(prefix);
  await fs.mkdir(tempDir, { recursive: true });

  const workspace = new Workspace(tempDir);
  await workspace.initialize();

  // Ensure common note types exist
  await workspace.ensureNoteType('general');
  await workspace.ensureNoteType('projects');
  await workspace.ensureNoteType('meetings');

  const noteManager = new NoteManager(workspace);
  const noteTypeManager = new NoteTypeManager(workspace);
  const searchManager = new SearchManager(workspace);
  const linkManager = new LinkManager(workspace, noteManager);
  const configManager = new ConfigManager(tempDir);

  return {
    tempDir,
    workspace,
    noteManager,
    noteTypeManager,
    searchManager,
    linkManager,
    configManager
  };
}

/**
 * Cleans up an integration test context
 */
export async function cleanupIntegrationTestContext(
  context: IntegrationTestContext
): Promise<void> {
  try {
    await fs.rm(context.tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Creates standard test notes for integration testing
 */
export async function createIntegrationTestNotes(
  context: IntegrationTestContext
): Promise<void> {
  const { noteManager } = context;

  // General notes with varied content for search testing
  await noteManager.createNote(
    'general',
    'JavaScript Tutorial',
    'Learning about JavaScript functions, closures, and async programming. This comprehensive guide covers modern JavaScript development patterns and best practices.'
  );

  await noteManager.createNote(
    'general',
    'Python Guide',
    'Python programming best practices and patterns. Understanding list comprehensions, decorators, and context managers for effective development.'
  );

  await noteManager.createNote(
    'general',
    'Web Development Notes',
    'Notes on HTML, CSS, and JavaScript. Building responsive web applications with modern frameworks like React and Vue.'
  );

  // Project notes
  await noteManager.createNote(
    'projects',
    'Website Redesign Project',
    'Planning the complete redesign of our company website. Focus on user experience and modern web technologies. Timeline and requirements analysis.'
  );

  await noteManager.createNote(
    'projects',
    'API Development Project',
    'Building a REST API using Node.js and Express. Need to implement authentication, rate limiting, and proper error handling.'
  );

  // Meeting notes
  await noteManager.createNote(
    'meetings',
    'Team Standup - 2024-01-15',
    'Discussed current sprint progress. JavaScript refactoring is on track. Python migration needs more time. Blocked issues resolved.'
  );

  await noteManager.createNote(
    'meetings',
    'Client Meeting - Project Requirements',
    'Client wants additional features in the web application. Need to estimate development time for JavaScript components and backend integration.'
  );
}

/**
 * Creates test notes with metadata for metadata integration testing
 */
export async function createIntegrationTestNotesWithMetadata(
  context: IntegrationTestContext
): Promise<void> {
  const { workspace } = context;

  // Note with comprehensive metadata
  const bookReviewNote = `---
title: "Atomic Habits"
author: "James Clear"
rating: 5
status: "completed"
tags: ["productivity", "habits", "self-improvement"]
isbn: "978-0735211292"
published_date: "2018-10-16"
type: "book-review"
created: "2024-01-15T10:30:00Z"
updated: "2024-01-15T10:30:00Z"
---

# Atomic Habits

This book provides excellent insights into habit formation and breaking bad habits.

## Key Takeaways
- Small changes compound over time
- Focus on systems, not goals
- Environment design is crucial

## My Rating: 5/5

Outstanding book with practical strategies for habit formation.
`;

  const bookReviewPath = workspace.getNotePath('general', 'atomic-habits.md');
  await fs.writeFile(bookReviewPath, bookReviewNote, 'utf8');

  // Project note with metadata
  const projectNote = `---
title: "jade-note Development"
project: "jade-note"
priority: "high"
status: "in-progress"
tags: ["development", "note-taking", "mcp"]
team: ["Alice", "Bob"]
deadline: "2024-03-01"
type: "project-note"
created: "2024-01-16T09:00:00Z"
updated: "2024-01-20T14:30:00Z"
---

# jade-note Development Project

Core development project for the jade-note system.

## Objectives
- Implement MCP server interface
- Create robust search functionality
- Add metadata validation
- Build comprehensive test suite

## Progress
- [x] Basic note management
- [x] Search implementation
- [ ] MCP server completion
- [ ] Integration testing
`;

  const projectNotePath = workspace.getNotePath('projects', 'jade-note-dev.md');
  await fs.writeFile(projectNotePath, projectNote, 'utf8');
}

/**
 * Creates test note types with schemas for metadata integration testing
 */
export async function createIntegrationTestNoteTypes(
  context: IntegrationTestContext
): Promise<void> {
  const { workspace } = context;

  // Ensure book-reviews note type exists
  await workspace.ensureNoteType('book-reviews');

  // Create book-reviews note type with comprehensive schema
  const bookReviewDescription = `# Book Reviews

## Purpose
Track and review books with structured metadata and ratings.

## Agent Instructions
- Always include a rating from 1-5
- Categorize by genre when possible
- Note key takeaways and actionable insights
- Include publication information when available

## Template (Optional)
# {{title}}

**Author:** {{author}}
**Rating:** {{rating}}/5
**Status:** {{status}}
**Genre:** {{genre}}

## Summary

## Key Insights

## My Notes

## Metadata Schema
Expected frontmatter fields:
- title: Book title (required, string)
- author: Author name (required, string)
- rating: Personal rating (required, number, min: 1, max: 5)
- status: Reading status (required, string, enum: ["to-read", "reading", "completed"])
- genre: Book genre (optional, string)
- isbn: ISBN number (optional, string, pattern: "^[0-9-]{10,17}$")
- published_date: Publication date (optional, string)
- tags: Topic tags (optional, array)
- notes: Personal notes (optional, string)
`;

  const bookReviewPath = workspace.getNoteTypePath('book-reviews');
  const descriptionPath = join(bookReviewPath, '.description.md');
  await fs.writeFile(descriptionPath, bookReviewDescription, 'utf8');

  // Create task note type
  await workspace.ensureNoteType('tasks');

  const taskDescription = `# Tasks

## Purpose
Manage individual tasks and action items with status tracking.

## Agent Instructions
- Always set a priority level
- Include due dates when applicable
- Track status changes with timestamps
- Link to related projects when relevant

## Template (Optional)
# {{title}}

**Priority:** {{priority}}
**Status:** {{status}}
**Due:** {{due_date}}

## Description

## Notes

## Metadata Schema
Expected frontmatter fields:
- title: Task title (required, string)
- priority: Priority level (required, string, enum: ["low", "medium", "high", "urgent"])
- status: Current status (required, string, enum: ["todo", "in-progress", "blocked", "completed"])
- due_date: Due date (optional, string)
- assignee: Person assigned (optional, string)
- project: Related project (optional, string)
- tags: Topic tags (optional, array)
- estimated_hours: Time estimate (optional, number)
`;

  const taskPath = workspace.getNoteTypePath('tasks');
  const taskDescriptionPath = join(taskPath, '.description.md');
  await fs.writeFile(taskDescriptionPath, taskDescription, 'utf8');
}

/**
 * Integration test constants
 */
export const INTEGRATION_TEST_CONSTANTS = {
  MCP_TIMEOUT: 10000,
  SERVER_START_DELAY: 1000,

  SAMPLE_NOTES: {
    JAVASCRIPT: {
      title: 'JavaScript Tutorial',
      content: 'Learning about JavaScript functions, closures, and async programming.',
      type: 'general'
    },
    PYTHON: {
      title: 'Python Guide',
      content: 'Python programming best practices and patterns.',
      type: 'general'
    },
    PROJECT: {
      title: 'Website Redesign Project',
      content: 'Planning the complete redesign of our company website.',
      type: 'projects'
    }
  },

  SEARCH_QUERIES: {
    SIMPLE: 'JavaScript',
    MULTI_WORD: 'JavaScript programming',
    PARTIAL: 'Java',
    NO_RESULTS: 'nonexistentterm12345',
    CASE_INSENSITIVE: ['javascript', 'JAVASCRIPT', 'JavaScript']
  },

  NOTE_TYPES: {
    DEFAULT: 'general',
    PROJECT: 'projects',
    MEETING: 'meetings',
    BOOK_REVIEW: 'book-reviews',
    TASK: 'tasks'
  }
} as const;

/**
 * Common integration test assertions
 */
export class IntegrationTestAssertions {
  /**
   * Assert MCP response format is correct
   */
  static assertMCPResponse(response: any, expectedFields: string[] = []): void {
    if (!response) {
      throw new Error('MCP response should not be null or undefined');
    }

    for (const field of expectedFields) {
      if (!(field in response)) {
        throw new Error(`MCP response should contain field: ${field}`);
      }
    }
  }

  /**
   * Assert search results format
   */
  static assertSearchResults(results: any[]): void {
    if (!Array.isArray(results)) {
      throw new Error('Search results should be an array');
    }

    for (const result of results) {
      const requiredFields = ['id', 'title', 'type', 'score', 'snippet', 'lastUpdated'];
      for (const field of requiredFields) {
        if (!(field in result)) {
          throw new Error(`Search result should contain field: ${field}`);
        }
      }

      if (typeof result.score !== 'number') {
        throw new Error('Search result score should be a number');
      }

      if (!Array.isArray(result.tags)) {
        throw new Error('Search result tags should be an array');
      }
    }
  }

  /**
   * Assert note creation response format
   */
  static assertNoteCreationResponse(response: any): void {
    const requiredFields = ['id', 'title', 'type', 'created'];
    this.assertMCPResponse(response, requiredFields);

    if (typeof response.id !== 'string') {
      throw new Error('Note ID should be a string');
    }

    if (typeof response.title !== 'string') {
      throw new Error('Note title should be a string');
    }
  }

  /**
   * Assert link creation response format
   */
  static assertLinkCreationResponse(response: any): void {
    if (!response.success) {
      throw new Error('Link creation should succeed');
    }

    if (!response.source || !response.target) {
      throw new Error('Link response should contain source and target');
    }

    if (!response.relationship) {
      throw new Error('Link response should contain relationship type');
    }
  }
}
