/**
 * Basic tests for jade-note project structure and imports
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Workspace } from '../src/core/workspace.ts';
import { NoteManager } from '../src/core/notes.ts';
import { NoteTypeManager } from '../src/core/note-types.ts';
import { SearchManager } from '../src/core/search.ts';
import { ConfigManager } from '../src/utils/config.ts';

describe('Project Structure', () => {
  test('should import core classes without errors', () => {
    assert.ok(Workspace, 'Workspace class should be importable');
    assert.ok(NoteManager, 'NoteManager class should be importable');
    assert.ok(NoteTypeManager, 'NoteTypeManager class should be importable');
    assert.ok(SearchManager, 'SearchManager class should be importable');
    assert.ok(ConfigManager, 'ConfigManager class should be importable');
  });

  test('should create instances of core classes', () => {
    const workspace = new Workspace('/tmp/test-workspace');
    assert.ok(workspace instanceof Workspace, 'Should create Workspace instance');

    const noteManager = new NoteManager(workspace);
    assert.ok(noteManager instanceof NoteManager, 'Should create NoteManager instance');

    const noteTypeManager = new NoteTypeManager(workspace);
    assert.ok(
      noteTypeManager instanceof NoteTypeManager,
      'Should create NoteTypeManager instance'
    );

    const searchManager = new SearchManager(workspace);
    assert.ok(
      searchManager instanceof SearchManager,
      'Should create SearchManager instance'
    );

    const configManager = new ConfigManager('/tmp/test-workspace');
    assert.ok(
      configManager instanceof ConfigManager,
      'Should create ConfigManager instance'
    );
  });
});

describe('Configuration', () => {
  test('should generate default configuration', () => {
    const configManager = new ConfigManager('/tmp/test-workspace');
    const defaultConfig = configManager.getDefaultConfig();

    assert.ok(defaultConfig.version, 'Should have version');
    assert.ok(defaultConfig.workspace_root, 'Should have workspace_root');
    assert.ok(defaultConfig.default_note_type, 'Should have default_note_type');
    assert.ok(defaultConfig.mcp_server, 'Should have mcp_server config');
    assert.ok(defaultConfig.search, 'Should have search config');
    assert.ok(defaultConfig.note_types, 'Should have note_types config');
  });

  test('should validate note type names', () => {
    const configManager = new ConfigManager('/tmp/test-workspace');

    assert.ok(configManager.isValidNoteTypeName('general'), 'Should accept valid name');
    assert.ok(
      configManager.isValidNoteTypeName('my-notes'),
      'Should accept hyphenated name'
    );
    assert.ok(
      configManager.isValidNoteTypeName('my_notes'),
      'Should accept underscored name'
    );

    assert.ok(!configManager.isValidNoteTypeName(''), 'Should reject empty name');
    assert.ok(
      !configManager.isValidNoteTypeName('.hidden'),
      'Should reject name starting with dot'
    );
    assert.ok(!configManager.isValidNoteTypeName('CON'), 'Should reject reserved name');
    assert.ok(
      !configManager.isValidNoteTypeName('my notes'),
      'Should reject name with spaces'
    );
  });
});

describe('Workspace', () => {
  test('should create workspace paths correctly', () => {
    const workspace = new Workspace('/tmp/test-workspace');

    const typePath = workspace.getNoteTypePath('general');
    assert.ok(typePath.includes('general'), 'Should create correct type path');

    const notePath = workspace.getNotePath('general', 'test.md');
    assert.ok(notePath.includes('general'), 'Should create correct note path');
    assert.ok(notePath.includes('test.md'), 'Should include filename in path');
  });

  test('should validate paths are in workspace', () => {
    const workspace = new Workspace('/tmp/test-workspace');

    assert.ok(
      workspace.isPathInWorkspace('/tmp/test-workspace/general/note.md'),
      'Should accept path in workspace'
    );
    assert.ok(
      !workspace.isPathInWorkspace('/etc/passwd'),
      'Should reject path outside workspace'
    );
  });
});
