/**
 * Unit tests for cross-platform module detection functionality
 *
 * Tests the isMainModule() function that determines if a module is being
 * run directly, which is critical for proper server and CLI startup
 * across different platforms (Windows, macOS, Linux).
 */

import { test, describe } from 'node:test';
import { strictEqual } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { resolve, normalize } from 'node:path';

describe('Module Detection', () => {
  test('should detect main module correctly', () => {
    // Simulate the isMainModule function logic
    function isMainModule(importMetaUrl: string, processArgv1: string): boolean {
      try {
        const currentFile = normalize(resolve(fileURLToPath(importMetaUrl)));
        const mainFile = normalize(resolve(processArgv1));
        return currentFile === mainFile;
      } catch {
        // Fallback to original logic if URL parsing fails
        return importMetaUrl === `file://${processArgv1}`;
      }
    }

    // Test case 1: Exact match (Unix-style paths)
    const unixPath = '/home/user/project/src/server.ts';
    const unixUrl = `file://${unixPath}`;
    strictEqual(
      isMainModule(unixUrl, unixPath),
      true,
      'Should detect main module with Unix paths'
    );

    // Test case 2: Windows-style paths (only test on Windows)
    if (process.platform === 'win32') {
      const windowsPath = 'C:\\Users\\user\\project\\src\\server.ts';
      const windowsUrl = `file:///${windowsPath.replace(/\\/g, '/')}`;
      strictEqual(
        isMainModule(windowsUrl, windowsPath),
        true,
        'Should detect main module with Windows paths'
      );
    }

    // Test case 3: Different files
    const file1 = '/home/user/project/src/server.ts';
    const file2 = '/home/user/project/src/cli.ts';
    const url1 = `file://${file1}`;
    strictEqual(
      isMainModule(url1, file2),
      false,
      'Should not detect main module when files differ'
    );

    // Test case 4: Relative vs absolute paths
    const relativePath = './src/server.ts';
    const absolutePath = resolve(relativePath);
    const relativeUrl = `file://${absolutePath}`;
    strictEqual(
      isMainModule(relativeUrl, relativePath),
      true,
      'Should handle relative vs absolute path comparison'
    );
  });

  test('should handle URL encoding correctly', () => {
    function isMainModule(importMetaUrl: string, processArgv1: string): boolean {
      try {
        const currentFile = normalize(resolve(fileURLToPath(importMetaUrl)));
        const mainFile = normalize(resolve(processArgv1));
        return currentFile === mainFile;
      } catch {
        return importMetaUrl === `file://${processArgv1}`;
      }
    }

    // Test with spaces in path
    const pathWithSpaces = '/home/user/my project/src/server.ts';
    const encodedUrl = `file://${pathWithSpaces.replace(/ /g, '%20')}`;
    strictEqual(
      isMainModule(encodedUrl, pathWithSpaces),
      true,
      'Should handle URL-encoded spaces correctly'
    );

    // Test with special characters
    const pathWithSpecialChars = '/home/user/project-name/src/server.ts';
    const specialUrl = `file://${pathWithSpecialChars}`;
    strictEqual(
      isMainModule(specialUrl, pathWithSpecialChars),
      true,
      'Should handle special characters correctly'
    );
  });

  test('should fall back to original logic on URL parsing errors', () => {
    function isMainModule(importMetaUrl: string, processArgv1: string): boolean {
      try {
        const currentFile = normalize(resolve(fileURLToPath(importMetaUrl)));
        const mainFile = normalize(resolve(processArgv1));
        return currentFile === mainFile;
      } catch {
        // Fallback to original logic if URL parsing fails
        return importMetaUrl === `file://${processArgv1}`;
      }
    }

    // Test with malformed URL
    const malformedUrl = 'not-a-valid-url';
    const validPath = '/home/user/project/src/server.ts';

    // Should not crash and should use fallback logic
    const result = isMainModule(malformedUrl, validPath);
    strictEqual(
      typeof result,
      'boolean',
      'Should return a boolean even with malformed URL'
    );

    // Test fallback behavior
    const fallbackUrl = `file://${validPath}`;
    strictEqual(
      isMainModule(fallbackUrl, validPath),
      true,
      'Fallback logic should work correctly'
    );
  });

  test('should handle edge cases', () => {
    function isMainModule(importMetaUrl: string, processArgv1: string): boolean {
      try {
        const currentFile = normalize(resolve(fileURLToPath(importMetaUrl)));
        const mainFile = normalize(resolve(processArgv1));
        return currentFile === mainFile;
      } catch {
        return importMetaUrl === `file://${processArgv1}`;
      }
    }

    // Test with empty strings
    strictEqual(isMainModule('', ''), false, 'Should handle empty strings gracefully');

    // Test with undefined/null (converted to strings)
    strictEqual(
      isMainModule('undefined', 'undefined'),
      false,
      'Should handle undefined values gracefully'
    );

    // Test with current directory references
    const currentDir = process.cwd();
    const relativePath = './server.ts';
    const absolutePath = resolve(currentDir, 'server.ts');
    const relativeUrl = `file://${absolutePath}`;

    strictEqual(
      isMainModule(relativeUrl, relativePath),
      true,
      'Should resolve current directory references correctly'
    );
  });

  test('should normalize path separators consistently', () => {
    // Test path normalization with platform-appropriate paths
    if (process.platform === 'win32') {
      // Test Windows path normalization
      const mixedPath1 = 'C:/Users/user\\project/src\\server.ts';
      const mixedPath2 = 'C:\\Users\\user/project\\src/server.ts';

      // Both should normalize to the same path
      const normalizedPath1 = normalize(resolve(mixedPath1));
      const normalizedPath2 = normalize(resolve(mixedPath2));

      strictEqual(
        normalizedPath1,
        normalizedPath2,
        'Mixed path separators should normalize to same path on Windows'
      );
    } else {
      // Test Unix path normalization
      const path1 = '/home/user/project/src/server.ts';
      const path2 = '/home/user/project/../project/src/server.ts';

      const normalizedPath1 = normalize(resolve(path1));
      const normalizedPath2 = normalize(resolve(path2));

      strictEqual(
        normalizedPath1,
        normalizedPath2,
        'Path normalization should resolve relative components on Unix'
      );
    }
  });
});
