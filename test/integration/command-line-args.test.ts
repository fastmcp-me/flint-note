/**
 * Integration tests for command-line argument parsing
 * Tests that the server correctly handles --workspace and other command-line arguments
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import {
  createIntegrationWorkspace,
  cleanupIntegrationWorkspace,
  type IntegrationTestContext,
  INTEGRATION_CONSTANTS
} from './helpers/integration-utils.ts';

describe('Command Line Arguments Integration', () => {
  let context: IntegrationTestContext;

  beforeEach(async () => {
    context = await createIntegrationWorkspace('cmd-args');
  });

  afterEach(async () => {
    await cleanupIntegrationWorkspace(context);
  });

  test('should start server with --workspace argument', async () => {
    const serverPath = join(process.cwd(), 'src', 'server.ts');

    const serverProcess = spawn('node', [serverPath, '--workspace', context.tempDir], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    context.serverProcess = serverProcess;

    let startupOutput = '';
    let errorOutput = '';
    let hasStarted = false;

    // Set timeout for server startup
    const startupTimeout = setTimeout(() => {
      if (!hasStarted) {
        serverProcess.kill('SIGKILL');
        assert.fail('Server failed to start within timeout');
      }
    }, INTEGRATION_CONSTANTS.SERVER_STARTUP_TIMEOUT);

    try {
      await new Promise<void>((resolve, reject) => {
        serverProcess.stdout?.on('data', data => {
          startupOutput += data.toString();
        });

        serverProcess.stderr?.on('data', data => {
          const output = data.toString();
          errorOutput += output;

          if (output.includes('Jade Note MCP server running on stdio')) {
            hasStarted = true;
            clearTimeout(startupTimeout);
            resolve();
          }
        });

        serverProcess.on('error', error => {
          clearTimeout(startupTimeout);
          reject(new Error(`Failed to start server: ${error.message}`));
        });

        serverProcess.on('exit', (code, signal) => {
          clearTimeout(startupTimeout);
          if (!hasStarted) {
            reject(
              new Error(
                `Server exited unexpectedly with code ${code}, signal ${signal}. Stdout: ${startupOutput}, Stderr: ${errorOutput}`
              )
            );
          }
        });
      });

      // Verify the server started successfully
      assert.ok(hasStarted, 'Server should start successfully');
      assert.ok(!serverProcess.killed, 'Server process should be running');
      assert.ok(
        errorOutput.includes(`workspace: ${context.tempDir}`),
        `Server should use specified workspace path. Error output: ${errorOutput}`
      );
    } finally {
      clearTimeout(startupTimeout);
    }
  });

  test('should start server with --workspace-path argument', async () => {
    const serverPath = join(process.cwd(), 'src', 'server.ts');

    const serverProcess = spawn(
      'node',
      [serverPath, '--workspace-path', context.tempDir],
      {
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );

    context.serverProcess = serverProcess;

    let hasStarted = false;
    let errorOutput = '';

    const startupTimeout = setTimeout(() => {
      if (!hasStarted) {
        serverProcess.kill('SIGKILL');
        assert.fail('Server failed to start within timeout');
      }
    }, INTEGRATION_CONSTANTS.SERVER_STARTUP_TIMEOUT);

    try {
      await new Promise<void>((resolve, reject) => {
        serverProcess.stderr?.on('data', data => {
          const output = data.toString();
          errorOutput += output;

          if (output.includes('Jade Note MCP server running on stdio')) {
            hasStarted = true;
            clearTimeout(startupTimeout);
            resolve();
          }
        });

        serverProcess.on('error', error => {
          clearTimeout(startupTimeout);
          reject(new Error(`Failed to start server: ${error.message}`));
        });

        serverProcess.on('exit', (code, signal) => {
          clearTimeout(startupTimeout);
          if (!hasStarted) {
            reject(
              new Error(`Server exited unexpectedly with code ${code}, signal ${signal}`)
            );
          }
        });
      });

      assert.ok(hasStarted, 'Server should start with --workspace-path argument');
      assert.ok(
        errorOutput.includes(`workspace: ${context.tempDir}`),
        'Server should use specified workspace path'
      );
    } finally {
      clearTimeout(startupTimeout);
    }
  });

  test('should show help message with --help argument', async () => {
    const serverPath = join(process.cwd(), 'src', 'server.ts');

    const serverProcess = spawn('node', [serverPath, '--help'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let hasExited = false;

    const helpTimeout = setTimeout(() => {
      if (!hasExited) {
        serverProcess.kill('SIGKILL');
        assert.fail('Server failed to show help within timeout');
      }
    }, 5000);

    try {
      await new Promise<void>((resolve, reject) => {
        serverProcess.stdout?.on('data', data => {
          stdout += data.toString();
        });

        serverProcess.on('exit', code => {
          hasExited = true;
          clearTimeout(helpTimeout);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Help command exited with code ${code}`));
          }
        });

        serverProcess.on('error', error => {
          clearTimeout(helpTimeout);
          reject(new Error(`Failed to run help command: ${error.message}`));
        });
      });

      assert.ok(hasExited, 'Server should exit after showing help');
      assert.ok(
        stdout.includes('jade-note MCP Server'),
        'Should show server name in help'
      );
      assert.ok(stdout.includes('--workspace'), 'Should show workspace option in help');
      assert.ok(stdout.includes('--help'), 'Should show help option in help');
    } finally {
      clearTimeout(helpTimeout);
    }
  });

  test('should show help message with -h argument', async () => {
    const serverPath = join(process.cwd(), 'src', 'server.ts');

    const serverProcess = spawn('node', [serverPath, '-h'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let hasExited = false;

    const helpTimeout = setTimeout(() => {
      if (!hasExited) {
        serverProcess.kill('SIGKILL');
        assert.fail('Server failed to show help within timeout');
      }
    }, 5000);

    try {
      await new Promise<void>((resolve, reject) => {
        serverProcess.stdout?.on('data', data => {
          stdout += data.toString();
        });

        serverProcess.on('exit', code => {
          hasExited = true;
          clearTimeout(helpTimeout);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Help command exited with code ${code}`));
          }
        });

        serverProcess.on('error', error => {
          clearTimeout(helpTimeout);
          reject(new Error(`Failed to run help command: ${error.message}`));
        });
      });

      assert.ok(hasExited, 'Server should exit after showing help');
      assert.ok(
        stdout.includes('jade-note MCP Server'),
        'Should show server name in help'
      );
    } finally {
      clearTimeout(helpTimeout);
    }
  });

  test('should handle invalid workspace path with proper error', async () => {
    const serverPath = join(process.cwd(), 'src', 'server.ts');
    const invalidPath = '/this/path/definitely/does/not/exist/anywhere';

    const serverProcess = spawn('node', [serverPath, '--workspace', invalidPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let errorOutput = '';
    let hasExited = false;

    const errorTimeout = setTimeout(() => {
      if (!hasExited) {
        serverProcess.kill('SIGKILL');
        assert.fail('Server failed to exit within timeout');
      }
    }, 5000);

    try {
      await new Promise<void>((resolve, reject) => {
        serverProcess.stderr?.on('data', data => {
          errorOutput += data.toString();
        });

        serverProcess.on('exit', code => {
          hasExited = true;
          clearTimeout(errorTimeout);
          if (code !== 0) {
            resolve(); // We expect a non-zero exit code for invalid path
          } else {
            reject(new Error('Server should exit with error code for invalid path'));
          }
        });

        serverProcess.on('error', error => {
          clearTimeout(errorTimeout);
          reject(new Error(`Failed to run server: ${error.message}`));
        });
      });

      assert.ok(hasExited, 'Server should exit with error for invalid path');
      assert.ok(
        errorOutput.includes('Failed to initialize') || errorOutput.includes('ENOENT'),
        `Should show appropriate error message. Got: ${errorOutput}`
      );
    } finally {
      clearTimeout(errorTimeout);
    }
  });

  test('should handle missing workspace argument value', async () => {
    const serverPath = join(process.cwd(), 'src', 'server.ts');

    const serverProcess = spawn('node', [serverPath, '--workspace'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let errorOutput = '';
    let hasExited = false;

    const errorTimeout = setTimeout(() => {
      if (!hasExited) {
        serverProcess.kill('SIGKILL');
        assert.fail('Server failed to exit within timeout');
      }
    }, 5000);

    try {
      await new Promise<void>((resolve, reject) => {
        serverProcess.stderr?.on('data', data => {
          errorOutput += data.toString();
        });

        serverProcess.on('exit', code => {
          hasExited = true;
          clearTimeout(errorTimeout);
          if (code !== 0) {
            resolve(); // We expect a non-zero exit code for missing argument
          } else {
            reject(
              new Error(
                'Server should exit with error code for missing workspace argument'
              )
            );
          }
        });

        serverProcess.on('error', error => {
          clearTimeout(errorTimeout);
          reject(new Error(`Failed to run server: ${error.message}`));
        });
      });

      assert.ok(
        hasExited,
        'Server should exit with error for missing workspace argument'
      );
      assert.ok(
        errorOutput.includes('requires a path argument'),
        `Should show missing argument error. Got: ${errorOutput}`
      );
    } finally {
      clearTimeout(errorTimeout);
    }
  });

  test('should prioritize --workspace over environment variable', async () => {
    const serverPath = join(process.cwd(), 'src', 'server.ts');

    // Set environment variable to a different path
    const serverProcess = spawn('node', [serverPath, '--workspace', context.tempDir], {
      env: {
        ...process.env,
        JADE_NOTE_WORKSPACE: '/some/other/path'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    context.serverProcess = serverProcess;

    let hasStarted = false;
    let errorOutput = '';

    const startupTimeout = setTimeout(() => {
      if (!hasStarted) {
        serverProcess.kill('SIGKILL');
        assert.fail('Server failed to start within timeout');
      }
    }, INTEGRATION_CONSTANTS.SERVER_STARTUP_TIMEOUT);

    try {
      await new Promise<void>((resolve, reject) => {
        serverProcess.stderr?.on('data', data => {
          const output = data.toString();
          errorOutput += output;

          if (output.includes('Jade Note MCP server running on stdio')) {
            hasStarted = true;
            clearTimeout(startupTimeout);
            resolve();
          }
        });

        serverProcess.on('error', error => {
          clearTimeout(startupTimeout);
          reject(new Error(`Failed to start server: ${error.message}`));
        });

        serverProcess.on('exit', (code, signal) => {
          clearTimeout(startupTimeout);
          if (!hasStarted) {
            reject(
              new Error(`Server exited unexpectedly with code ${code}, signal ${signal}`)
            );
          }
        });
      });

      assert.ok(hasStarted, 'Server should start successfully');
      assert.ok(
        errorOutput.includes(`workspace: ${context.tempDir}`),
        'Server should use --workspace argument, not environment variable'
      );
      assert.ok(
        !errorOutput.includes('deprecated'),
        'Should not show deprecation warning when using --workspace'
      );
    } finally {
      clearTimeout(startupTimeout);
    }
  });
});
