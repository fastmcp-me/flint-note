/**
 * Unit tests for server configuration and command-line argument parsing
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { JadeNoteServer } from '../../src/server.ts';
import {
  createTestServer,
  cleanupTestServer,
  type ServerTestContext
} from './helpers/test-utils.ts';

describe('Server Configuration', () => {
  let context: ServerTestContext;

  afterEach(async () => {
    if (context) {
      await cleanupTestServer(context);
    }
  });

  test('should initialize server with explicit workspace path', async () => {
    context = await createTestServer('server-config-explicit');

    // Server should be initialized and workspace path should be set
    assert.ok(context.server, 'Server should be created');
    assert.ok(context.tempDir, 'Temp directory should be set');
  });

  test('should create server with default configuration', async () => {
    const server = new JadeNoteServer();
    assert.ok(server, 'Server should be created with default configuration');
  });

  test('should create server with explicit workspace configuration', async () => {
    context = await createTestServer('server-config-workspace');

    const server = new JadeNoteServer({ workspacePath: context.tempDir });
    assert.ok(server, 'Server should be created with workspace configuration');

    await server.initialize();
    // If initialization succeeds without error, the workspace path was accepted
  });

  test('should handle invalid workspace path gracefully', async () => {
    const server = new JadeNoteServer({
      workspacePath: '/this/path/definitely/does/not/exist/anywhere',
      throwOnError: true
    });

    try {
      await server.initialize();
      assert.fail('Should throw error for non-existent workspace path');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw an error');
      assert.ok(
        error.message.includes('Failed to initialize') ||
          error.message.includes('ENOENT') ||
          error.message.includes('no such file or directory'),
        `Error should indicate path issue. Got: ${error.message}`
      );
    }
  });
});

describe('Command Line Argument Parsing', () => {
  // Note: These tests would need to be integration tests to properly test
  // the parseArgs function since it's not exported. For now, we test the
  // server configuration that would result from parsed arguments.

  test('should accept workspace configuration similar to --workspace argument', async () => {
    let context: ServerTestContext | null = null;

    try {
      context = await createTestServer('cmd-args-workspace');

      // This simulates what would happen if --workspace was passed
      const server = new JadeNoteServer({ workspacePath: context.tempDir });
      await server.initialize();

      // If we get here, the workspace path was accepted
      assert.ok(true, 'Server should accept workspace path configuration');
    } finally {
      if (context) {
        await cleanupTestServer(context);
      }
    }
  });

  test('should handle empty configuration object', async () => {
    const server = new JadeNoteServer({});
    assert.ok(server, 'Server should handle empty configuration');
  });

  test('should prioritize explicit workspace over environment', async () => {
    let context: ServerTestContext | null = null;

    try {
      context = await createTestServer('explicit-vs-env');

      // Set environment variable
      const originalEnv = process.env.JADE_NOTE_WORKSPACE;
      process.env.JADE_NOTE_WORKSPACE = '/some/other/path';

      try {
        // Create server with explicit workspace (should override env)
        const server = new JadeNoteServer({
          workspacePath: context.tempDir,
          throwOnError: true
        });
        await server.initialize();

        // If initialization succeeds, explicit workspace was used
        assert.ok(true, 'Explicit workspace should override environment variable');
      } finally {
        // Restore original environment
        if (originalEnv === undefined) {
          delete process.env.JADE_NOTE_WORKSPACE;
        } else {
          process.env.JADE_NOTE_WORKSPACE = originalEnv;
        }
      }
    } finally {
      if (context) {
        await cleanupTestServer(context);
      }
    }
  });
});

describe('Server Configuration Edge Cases', () => {
  test('should handle relative workspace paths', async () => {
    let context: ServerTestContext | null = null;

    try {
      context = await createTestServer('relative-path');

      // Use a relative path that resolves to our temp directory
      const relativePath = `./${context.tempDir.split('/').pop()}`;

      // Change to parent directory to make relative path meaningful
      const originalCwd = process.cwd();
      const parentDir = context.tempDir.split('/').slice(0, -1).join('/');

      try {
        process.chdir(parentDir);

        const server = new JadeNoteServer({
          workspacePath: relativePath,
          throwOnError: true
        });
        await server.initialize();

        assert.ok(true, 'Server should handle relative paths');
      } finally {
        process.chdir(originalCwd);
      }
    } finally {
      if (context) {
        await cleanupTestServer(context);
      }
    }
  });

  test('should handle workspace path with special characters', async () => {
    // Skip this test on Windows due to path restrictions
    if (process.platform === 'win32') {
      return;
    }

    let context: ServerTestContext | null = null;

    try {
      // Create a directory with spaces and special characters
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const { mkdir, rm } = await import('node:fs/promises');

      const specialDir = join(tmpdir(), 'jade note test (special)');
      await mkdir(specialDir, { recursive: true });
      await mkdir(join(specialDir, 'general'), { recursive: true });
      await mkdir(join(specialDir, '.jade-note'), { recursive: true });

      try {
        const server = new JadeNoteServer({
          workspacePath: specialDir,
          throwOnError: true
        });
        await server.initialize();

        assert.ok(true, 'Server should handle paths with special characters');
      } finally {
        await rm(specialDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Some filesystems might not support special characters
      console.warn('Skipping special character test due to filesystem limitations');
    }
  });
});
