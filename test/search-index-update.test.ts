/**
 * Search Index Update Tests
 * Tests that the search index is properly updated when notes are created, updated, or deleted
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Workspace } from '../src/core/workspace.ts';
import { SearchManager } from '../src/core/search.ts';
import { NoteManager } from '../src/core/notes.ts';

interface TestContext {
  tempDir: string;
  workspace: Workspace;
  searchManager: SearchManager;
  noteManager: NoteManager;
}

describe('Search Index Update Tests', () => {
  let context: TestContext;

  beforeEach(async () => {
    // Create temporary workspace
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'jade-note-search-index-test-')
    );
    const workspace = new Workspace(tempDir);

    // Initialize managers
    const searchManager = new SearchManager(workspace);
    const noteManager = new NoteManager(workspace);

    // Create test workspace structure
    await workspace.initialize();
    await workspace.ensureNoteType('general');
    await workspace.ensureNoteType('projects');

    context = {
      tempDir,
      workspace,
      searchManager,
      noteManager
    };
  });

  afterEach(async () => {
    await fs.rm(context.tempDir, { recursive: true, force: true });
  });

  describe('Search Index Updates on Note Creation', () => {
    test('should update search index when creating a new note', async () => {
      // Create a note with unique content
      const uniqueTitle = `Test Note ${Date.now()}`;
      const uniqueContent = `This is unique content ${Math.random()}`;

      const noteInfo = await context.noteManager.createNote(
        'general',
        uniqueTitle,
        uniqueContent
      );

      // Search for the note immediately after creation
      const results = await context.searchManager.searchNotes('unique content');

      // Should find the newly created note
      assert.ok(results.length > 0, 'Should find newly created note');
      const foundNote = results.find(note => note.title === uniqueTitle);
      assert.ok(foundNote, 'Should find note with correct title');
      assert.ok(
        foundNote.snippet.includes('unique') && foundNote.snippet.includes('content'),
        'Should find note with correct content'
      );
    });

    test('should make new note searchable by title', async () => {
      const uniqueTitle = `Searchable Title ${Date.now()}`;

      await context.noteManager.createNote(
        'general',
        uniqueTitle,
        'Some regular content here'
      );

      // Search by title
      const results = await context.searchManager.searchNotes('Searchable Title');

      assert.ok(results.length > 0, 'Should find note by title');
      const foundNote = results.find(note => note.title === uniqueTitle);
      assert.ok(foundNote, 'Should find note with matching title');
    });

    test('should make new note searchable by content', async () => {
      const uniqueKeyword = `keyword${Date.now()}`;

      await context.noteManager.createNote(
        'general',
        'Regular Title',
        `This content contains the ${uniqueKeyword} for searching`
      );

      // Search by content keyword
      const results = await context.searchManager.searchNotes(uniqueKeyword);

      assert.ok(results.length > 0, 'Should find note by content');
      const foundNote = results.find(
        note =>
          note.snippet.toLowerCase().includes(uniqueKeyword.toLowerCase()) ||
          note.title.toLowerCase().includes(uniqueKeyword.toLowerCase())
      );
      assert.ok(foundNote, 'Should find note with matching content');
    });

    test('should make new note findable by type filter', async () => {
      const uniqueTitle = `Project Note ${Date.now()}`;

      await context.noteManager.createNote(
        'projects',
        uniqueTitle,
        'This is a project note'
      );

      // Search with type filter
      const results = await context.searchManager.searchNotes('project note', 'projects');

      assert.ok(results.length > 0, 'Should find note with type filter');
      const foundNote = results.find(note => note.title === uniqueTitle);
      assert.ok(foundNote, 'Should find note with correct title');
      assert.strictEqual(foundNote.type, 'projects', 'Should have correct type');
    });

    test('should handle multiple notes created in sequence', async () => {
      const notes = [
        { title: `First Note ${Date.now()}`, content: 'First unique content' },
        { title: `Second Note ${Date.now()}`, content: 'Second unique content' },
        { title: `Third Note ${Date.now()}`, content: 'Third unique content' }
      ];

      // Create multiple notes
      for (const note of notes) {
        await context.noteManager.createNote('general', note.title, note.content);
      }

      // Search for each note
      for (const note of notes) {
        const results = await context.searchManager.searchNotes(note.title);
        assert.ok(results.length > 0, `Should find note: ${note.title}`);

        const foundNote = results.find(result => result.title === note.title);
        assert.ok(foundNote, `Should find specific note: ${note.title}`);
      }
    });
  });

  describe('Search Index Updates on Note Modification', () => {
    test('should update search index when note is updated', async () => {
      const originalTitle = `Original Title ${Date.now()}`;
      const originalContent = 'Original content';

      // Create initial note
      const noteInfo = await context.noteManager.createNote(
        'general',
        originalTitle,
        originalContent
      );

      // Verify original note is searchable
      let results = await context.searchManager.searchNotes('Original content');
      assert.ok(results.length > 0, 'Should find original note');

      // Update the note
      const newContent = 'Updated content with new keywords';
      await context.noteManager.updateNote(noteInfo.id, newContent);

      // Search for new content
      results = await context.searchManager.searchNotes('new keywords');
      assert.ok(results.length > 0, 'Should find updated note');

      const foundNote = results.find(note => note.title === originalTitle);
      assert.ok(foundNote, 'Should find note with original title');
      assert.ok(
        foundNote.snippet.includes('new') && foundNote.snippet.includes('keywords'),
        'Should contain updated content'
      );
    });

    test('should remove old content from search after update', async () => {
      const title = `Test Note ${Date.now()}`;
      const originalKeyword = `oldkeyword${Date.now()}`;
      const newKeyword = `newkeyword${Date.now()}`;

      // Create note with original content
      const noteInfo = await context.noteManager.createNote(
        'general',
        title,
        `Content with ${originalKeyword}`
      );

      // Update with new content
      await context.noteManager.updateNote(noteInfo.id, `Content with ${newKeyword}`);

      // Should find new content
      const newResults = await context.searchManager.searchNotes(newKeyword);
      assert.ok(newResults.length > 0, 'Should find note with new keyword');

      // Should not find old content (or should rank it very low)
      const oldResults = await context.searchManager.searchNotes(originalKeyword);
      const oldNote = oldResults.find(note => note.title === title);
      assert.ok(!oldNote, 'Should not find note with old keyword after update');
    });
  });

  describe('Search Index Consistency', () => {
    test('should maintain search index integrity across operations', async () => {
      // Create initial notes
      const initialNotes = [
        { title: 'Note A', content: 'Content A' },
        { title: 'Note B', content: 'Content B' },
        { title: 'Note C', content: 'Content C' }
      ];

      const createdNotes = [];
      for (const note of initialNotes) {
        const noteInfo = await context.noteManager.createNote(
          'general',
          note.title,
          note.content
        );
        createdNotes.push(noteInfo);
      }

      // Verify search index contains all notes
      let allResults = await context.searchManager.searchNotes('Content');
      assert.strictEqual(allResults.length, 3, 'Should find all three notes in search');

      // Update one note
      await context.noteManager.updateNote(createdNotes[1].id, 'Updated Content B');

      // Delete one note
      await context.noteManager.deleteNote(createdNotes[2].id);

      // Verify search results reflect changes
      allResults = await context.searchManager.searchNotes('Content');
      assert.strictEqual(allResults.length, 2, 'Should find two notes after deletion');

      const updatedResults = await context.searchManager.searchNotes('Updated');
      assert.strictEqual(updatedResults.length, 1, 'Should find updated note');
    });

    test('should handle search index persistence', async () => {
      const testTitle = `Persistent Note ${Date.now()}`;

      // Create a note
      await context.noteManager.createNote(
        'general',
        testTitle,
        'This note should persist in search index'
      );

      // Verify search index file exists and contains the note
      const indexPath = context.workspace.searchIndexPath;
      const indexExists = await fs
        .access(indexPath)
        .then(() => true)
        .catch(() => false);
      assert.ok(indexExists, 'Search index file should exist');

      // Read and verify index content
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);

      assert.ok(index.notes, 'Index should have notes object');
      assert.ok(Object.keys(index.notes).length > 0, 'Index should contain notes');

      // Find our note in the index
      const noteInIndex = Object.values(index.notes).find(
        (note: any) => note.title === testTitle
      );
      assert.ok(noteInIndex, 'Created note should be in search index');
    });

    test('should recover from missing search index', async () => {
      // Create a note first
      const testTitle = `Recovery Test ${Date.now()}`;
      await context.noteManager.createNote(
        'general',
        testTitle,
        'This tests index recovery'
      );

      // Delete the search index file
      const indexPath = context.workspace.searchIndexPath;
      await fs.unlink(indexPath).catch(() => {}); // Ignore errors if file doesn't exist

      // Try to search - should still work by rebuilding index
      const results = await context.searchManager.searchNotes(testTitle);

      // Note: This test may fail if the search doesn't automatically rebuild
      // In that case, it indicates the bug we're trying to fix
      assert.ok(results.length > 0, 'Should find note even after index deletion');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle notes with special characters in content', async () => {
      const specialContent = 'Content with special chars: @#$%^&*()[]{}|;:,.<>?';
      const title = `Special Chars ${Date.now()}`;

      await context.noteManager.createNote('general', title, specialContent);

      // Search should handle special characters gracefully
      const results = await context.searchManager.searchNotes('special chars');
      assert.ok(results.length > 0, 'Should find note with special characters');
    });

    test('should handle very long note content', async () => {
      const longContent = 'This is a very long note. '.repeat(1000);
      const title = `Long Note ${Date.now()}`;

      await context.noteManager.createNote('general', title, longContent);

      const results = await context.searchManager.searchNotes('very long note');
      assert.ok(results.length > 0, 'Should find note with long content');

      // Snippet should be reasonably sized
      const foundNote = results.find(note => note.title === title);
      assert.ok(foundNote, 'Should find the long note');
      assert.ok(
        foundNote.snippet.length <= 300,
        'Snippet should be truncated to reasonable length'
      );
    });

    test('should handle concurrent note creation', async () => {
      const promises = [];
      const noteCount = 5;

      // Create multiple notes concurrently
      for (let i = 0; i < noteCount; i++) {
        const title = `Concurrent Note ${i} ${Date.now()}`;
        const content = `Concurrent content ${i}`;
        promises.push(context.noteManager.createNote('general', title, content));
      }

      await Promise.all(promises);

      // All notes should be searchable
      const searchResults = await context.searchManager.searchNotes('Concurrent');

      assert.ok(
        searchResults.length >= noteCount,
        'Should find all concurrently created notes'
      );
    });
  });
});
