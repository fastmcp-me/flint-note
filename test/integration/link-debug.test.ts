/**
 * Link Debug Test
 *
 * Simple diagnostic test to debug link storage issues
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Workspace } from '../../src/core/workspace.ts';
import { NoteManager } from '../../src/core/notes.ts';
import { LinkManager } from '../../src/core/links.ts';

let tempDir: string;
let workspace: Workspace;
let noteManager: NoteManager;
let linkManager: LinkManager;

describe('Link Debug', () => {
  beforeEach(async () => {
    // Create temporary workspace
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jade-note-debug-'));
    workspace = new Workspace(tempDir);
    await workspace.initialize();

    noteManager = new NoteManager(workspace);
    linkManager = new LinkManager(workspace, noteManager);

    // Create simple test notes
    await noteManager.createNote('general', 'Note A', 'Content of note A');
    await noteManager.createNote('general', 'Note B', 'Content of note B');
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  test('should debug basic link creation and storage', async () => {
    console.log('\n=== LINK DEBUG TEST ===');

    // Step 1: Verify notes exist
    console.log('1. Checking initial notes...');
    const noteA = await noteManager.getNote('general/note-a.md');
    const noteB = await noteManager.getNote('general/note-b.md');

    console.log('Note A:', {
      id: noteA.id,
      title: noteA.title,
      metadata: noteA.metadata
    });
    console.log('Note B:', {
      id: noteB.id,
      title: noteB.title,
      metadata: noteB.metadata
    });

    // Step 2: Create a simple link
    console.log('\n2. Creating link...');
    const result = await linkManager.linkNotes({
      source: 'general/note-a.md',
      target: 'general/note-b.md',
      relationship: 'references',
      bidirectional: true
    });

    console.log('Link result:', result);

    // Step 3: Check what happened to the notes
    console.log('\n3. Checking notes after linking...');
    const updatedNoteA = await noteManager.getNote('general/note-a.md');
    const updatedNoteB = await noteManager.getNote('general/note-b.md');

    console.log('Updated Note A metadata:', updatedNoteA.metadata);
    console.log('Updated Note A rawContent:', updatedNoteA.rawContent);
    console.log('Updated Note B metadata:', updatedNoteB.metadata);
    console.log('Updated Note B rawContent:', updatedNoteB.rawContent);

    // Step 4: Check the actual files on disk
    console.log('\n4. Checking files on disk...');
    const filePathA = path.join(workspace.getNoteTypePath('general'), 'note-a.md');
    const filePathB = path.join(workspace.getNoteTypePath('general'), 'note-b.md');

    const fileContentA = await fs.readFile(filePathA, 'utf-8');
    const fileContentB = await fs.readFile(filePathB, 'utf-8');

    console.log('File A content:\n', fileContentA);
    console.log('File B content:\n', fileContentB);

    // Basic assertions
    assert.ok(result.success, 'Link creation should succeed');
    assert.ok(
      updatedNoteA.metadata.links || updatedNoteB.metadata.links,
      'At least one note should have links'
    );
  });

  test('should debug frontmatter parsing', async () => {
    console.log('\n=== FRONTMATTER DEBUG TEST ===');

    // Create a note with frontmatter manually
    const noteWithFrontmatter = `---
title: "Test Note"
type: "general"
tags: ["test"]
---

# Test Note

This is a test note with frontmatter.`;

    const testNotePath = path.join(
      workspace.getNoteTypePath('general'),
      'frontmatter-test.md'
    );
    await fs.writeFile(testNotePath, noteWithFrontmatter);

    console.log('1. Reading note with frontmatter...');
    const parsedNote = await noteManager.getNote('general/frontmatter-test.md');
    console.log('Parsed metadata:', parsedNote.metadata);
    console.log('Parsed content:', parsedNote.content);

    // Now try to add links
    console.log('\n2. Adding links to note with existing frontmatter...');
    const result = await linkManager.linkNotes({
      source: 'general/frontmatter-test.md',
      target: 'general/note-a.md',
      relationship: 'references',
      bidirectional: false
    });

    console.log('Link result:', result);

    console.log('\n3. Checking updated note...');
    const updatedNote = await noteManager.getNote('general/frontmatter-test.md');
    console.log('Updated metadata:', updatedNote.metadata);
    console.log('Updated rawContent:', updatedNote.rawContent);

    const updatedFileContent = await fs.readFile(testNotePath, 'utf-8');
    console.log('Updated file content:\n', updatedFileContent);
  });

  test('should debug YAML parsing with links', async () => {
    console.log('\n=== YAML LINKS DEBUG TEST ===');

    // Create a note with links in frontmatter manually
    const noteWithLinks = `---
title: "Note With Links"
type: "general"
links:
  - target: "general/note-a.md"
    relationship: "references"
    created: "2024-01-01T00:00:00Z"
    context: "Manual link"
---

# Note With Links

This note has manually added links.`;

    const testNotePath = path.join(workspace.getNoteTypePath('general'), 'links-test.md');
    await fs.writeFile(testNotePath, noteWithLinks);

    console.log('1. Reading note with manual links...');
    const parsedNote = await noteManager.getNote('general/links-test.md');
    console.log('Parsed metadata:', parsedNote.metadata);
    console.log('Parsed links:', parsedNote.metadata.links);

    // Verify the links are parsed correctly
    assert.ok(parsedNote.metadata.links, 'Links should be parsed');
    assert.ok(Array.isArray(parsedNote.metadata.links), 'Links should be an array');
    assert.strictEqual(parsedNote.metadata.links.length, 1, 'Should have one link');
    assert.strictEqual(
      parsedNote.metadata.links[0].target,
      'general/note-a.md',
      'Link target should be correct'
    );
    assert.strictEqual(
      parsedNote.metadata.links[0].relationship,
      'references',
      'Link relationship should be correct'
    );
  });
});
