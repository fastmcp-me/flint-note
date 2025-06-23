/**
 * Basic integration tests for jade-note MCP server
 * Tests that the server can start and stop correctly
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  createIntegrationWorkspace,
  cleanupIntegrationWorkspace,
  startServer,
  stopServer,
  type IntegrationTestContext,
  INTEGRATION_CONSTANTS
} from './helpers/integration-utils.ts';

describe('MCP Server Integration', () => {
  let context: IntegrationTestContext;

  beforeEach(async () => {
    context = await createIntegrationWorkspace('server-basic');
  });

  afterEach(async () => {
    await cleanupIntegrationWorkspace(context);
  });

  test('should start server and receive startup message', async () => {
    // Start the server
    context.serverProcess = await startServer({
      workspacePath: context.tempDir,
      timeout: INTEGRATION_CONSTANTS.SERVER_STARTUP_TIMEOUT
    });

    // Verify the server process is running
    assert.ok(context.serverProcess, 'Server process should be created');
    assert.ok(!context.serverProcess.killed, 'Server process should be running');
    assert.ok(context.serverProcess.pid, 'Server process should have a PID');
  });

  test('should gracefully shutdown server', async () => {
    // Start the server
    context.serverProcess = await startServer({
      workspacePath: context.tempDir
    });

    // Stop the server gracefully
    await stopServer(
      context.serverProcess,
      INTEGRATION_CONSTANTS.SERVER_SHUTDOWN_TIMEOUT
    );

    // Verify server has stopped
    assert.ok(
      context.serverProcess.killed,
      'Server should be stopped after graceful shutdown'
    );
  });

  test('should handle invalid workspace path', async () => {
    const invalidPath = '/nonexistent/path/that/does/not/exist';

    try {
      context.serverProcess = await startServer({
        workspacePath: invalidPath,
        timeout: 2000 // Shorter timeout for error case
      });
      assert.fail('Server should not start with invalid workspace path');
    } catch (error) {
      // Expected to fail - server should not start with invalid workspace
      assert.ok(error instanceof Error, 'Should throw an error for invalid workspace');
      // The error could be either startup failure or server exit
      assert.ok(
        error.message.includes('failed to start') ||
          error.message.includes('Server failed to start') ||
          error.message.includes('exited unexpectedly'),
        `Error message should indicate startup failure. Got: ${error.message}`
      );
    }
  });
});
