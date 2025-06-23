/**
 * Shared integration test utilities for jade-note MCP server testing
 *
 * Provides common functions for server lifecycle management, workspace setup,
 * and MCP protocol communication testing.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';

/**
 * Integration test context containing server process and workspace info
 */
export interface IntegrationTestContext {
  tempDir: string;
  serverProcess?: ChildProcess;
}

/**
 * Server startup options
 */
export interface ServerStartupOptions {
  workspacePath: string;
  timeout?: number;
  env?: Record<string, string>;
}

/**
 * Creates a unique temporary directory name for integration tests
 */
export function createTempDirName(prefix = 'jade-note-integration'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return join(tmpdir(), `${prefix}-${timestamp}-${random}`);
}

/**
 * Creates a temporary workspace for integration testing
 */
export async function createIntegrationWorkspace(prefix?: string): Promise<IntegrationTestContext> {
  const tempDir = createTempDirName(prefix);
  await fs.mkdir(tempDir, { recursive: true });

  // Create basic workspace structure
  await fs.mkdir(join(tempDir, 'general'), { recursive: true });
  await fs.mkdir(join(tempDir, '.jade-note'), { recursive: true });

  return { tempDir };
}

/**
 * Cleans up integration test workspace and kills any running server processes
 */
export async function cleanupIntegrationWorkspace(context: IntegrationTestContext): Promise<void> {
  // Kill server process if it's still running
  if (context.serverProcess && !context.serverProcess.killed) {
    context.serverProcess.kill('SIGTERM');

    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 100));

    // Force kill if still running
    if (!context.serverProcess.killed) {
      context.serverProcess.kill('SIGKILL');
    }
  }

  // Clean up temporary directory
  try {
    await fs.rm(context.tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Starts the MCP server as a child process
 */
export async function startServer(options: ServerStartupOptions): Promise<ChildProcess> {
  const { workspacePath, timeout = 5000, env = {} } = options;

  return new Promise((resolve, reject) => {
    const serverPath = join(process.cwd(), 'src', 'server.ts');

    const serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        JADE_NOTE_WORKSPACE: workspacePath,
        ...env
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let startupOutput = '';
    let errorOutput = '';
    let hasStarted = false;

    // Set a timeout for server startup
    const startupTimeout = setTimeout(() => {
      if (!hasStarted) {
        serverProcess.kill('SIGKILL');
        reject(new Error(`Server failed to start within ${timeout}ms. Stdout: ${startupOutput}, Stderr: ${errorOutput}`));
      }
    }, timeout);

    // Listen for server output
    serverProcess.stdout?.on('data', (data) => {
      startupOutput += data.toString();
    });

    // Listen for server startup message
    serverProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      errorOutput += output;

      if (output.includes('jade-note MCP server running on stdio')) {
        hasStarted = true;
        clearTimeout(startupTimeout);
        resolve(serverProcess);
      }
    });

    // Handle server errors
    serverProcess.on('error', (error) => {
      clearTimeout(startupTimeout);
      reject(new Error(`Failed to start server: ${error.message}`));
    });

    // Handle unexpected server exit
    serverProcess.on('exit', (code, signal) => {
      clearTimeout(startupTimeout);
      if (!hasStarted) {
        reject(new Error(`Server exited unexpectedly with code ${code}, signal ${signal}. Stdout: ${startupOutput}, Stderr: ${errorOutput}`));
      }
    });
  });
}

/**
 * Gracefully stops a server process
 */
export async function stopServer(serverProcess: ChildProcess, timeout = 2000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!serverProcess || serverProcess.killed) {
      resolve();
      return;
    }

    const shutdownTimeout = setTimeout(() => {
      // Force kill if graceful shutdown failed
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      reject(new Error(`Server failed to shutdown gracefully within ${timeout}ms`));
    }, timeout);

    serverProcess.on('exit', () => {
      clearTimeout(shutdownTimeout);
      resolve();
    });

    // Send SIGTERM for graceful shutdown
    serverProcess.kill('SIGTERM');
  });
}

/**
 * Creates test notes in a workspace for integration testing
 */
export async function createIntegrationTestNotes(workspacePath: string): Promise<void> {
  // Create a simple test note
  const testNote1 = `# Test Note 1

This is a test note for integration testing.

## Content

Sample content for testing search and retrieval functionality.
`;

  await fs.writeFile(join(workspacePath, 'general', 'test-note-1.md'), testNote1, 'utf8');

  // Create a note with metadata
  const testNote2 = `---
title: "Integration Test Note"
tags: ["integration", "testing"]
created: "2024-01-01T00:00:00Z"
---

# Integration Test Note

This note contains metadata for testing purposes.

## Testing Features

- Metadata parsing
- Search functionality
- MCP protocol communication
`;

  await fs.writeFile(join(workspacePath, 'general', 'integration-test-note.md'), testNote2, 'utf8');

  // Create a note in a different type
  await fs.mkdir(join(workspacePath, 'projects'), { recursive: true });

  const projectNote = `# Test Project

This is a project note for testing different note types.

## Goals

Test the note type functionality in integration tests.
`;

  await fs.writeFile(join(workspacePath, 'projects', 'test-project.md'), projectNote, 'utf8');
}

/**
 * Creates a note type with description for integration testing
 */
export async function createTestNoteType(
  workspacePath: string,
  noteType: string,
  description: string
): Promise<void> {
  const noteTypePath = join(workspacePath, noteType);
  await fs.mkdir(noteTypePath, { recursive: true });

  const descriptionPath = join(noteTypePath, '.description.md');
  await fs.writeFile(descriptionPath, description, 'utf8');
}

/**
 * Waits for a condition to be true, with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms timeout`);
}

/**
 * Integration test constants
 */
export const INTEGRATION_CONSTANTS = {
  DEFAULT_TIMEOUT: 5000,
  SERVER_STARTUP_TIMEOUT: 10000,
  SERVER_SHUTDOWN_TIMEOUT: 2000,

  TEST_NOTES: {
    SIMPLE: {
      title: 'Simple Test Note',
      content: 'This is a simple test note for integration testing.'
    },
    WITH_METADATA: {
      title: 'Test Note with Metadata',
      content: `---
title: "Test Note with Metadata"
tags: ["test", "integration"]
created: "2024-01-01T00:00:00Z"
---

# Test Note with Metadata

This note has frontmatter metadata for testing.`
    }
  },

  NOTE_TYPES: {
    DEFAULT: 'general',
    PROJECTS: 'projects',
    MEETINGS: 'meetings',
    BOOKS: 'book-reviews'
  }
} as const;
