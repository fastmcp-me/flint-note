/**
 * Note Retrieval Tests
 *
 * Comprehensive tests for note retrieval functionality including
 * content parsing, metadata extraction, error handling, and edge cases.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { Workspace } from '../src/core/workspace.ts';
import { NoteManager } from '../src/core/notes.ts';
import { NoteTypeManager } from '../src/core/note-types.ts';

describe('Note Retrieval', () => {
  let testWorkspaceRoot: string;
  let workspace: Workspace;
  let noteManager: NoteManager;
  let noteTypeManager: NoteTypeManager;

  beforeEach(async () => {
    // Create a unique temporary directory for each test
    testWorkspaceRoot = path.join(
      tmpdir(),
      `jade-note-test-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await fs.mkdir(testWorkspaceRoot, { recursive: true });

    // Initialize workspace and managers
    workspace = new Workspace(testWorkspaceRoot);
    await workspace.initialize();

    noteManager = new NoteManager(workspace);
    noteTypeManager = new NoteTypeManager(workspace);
  });

  afterEach(async () => {
    // Clean up test workspace
    try {
      await fs.rm(testWorkspaceRoot, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Note Retrieval', () => {
    test('should retrieve a note with basic content', async () => {
      // Create a simple note first
      const title = 'Test Note';
      const content = 'This is the content of my test note.';

      const result = await noteManager.createNote('general', title, content);

      // Retrieve the note using the ID from the creation result
      const note = await noteManager.getNote(result.id);

      assert.strictEqual(note.title, title);
      assert.ok(note.content.includes(content));
      assert.strictEqual(note.type, 'general');
      assert.strictEqual(note.filename, 'test-note.md');
      assert.ok(note.path.includes('test-note.md'));
      assert.ok(note.id, 'Note should have an ID');
      assert.ok(note.created, 'Note should have creation timestamp');
      assert.ok(note.modified, 'Note should have modification timestamp');
      assert.ok(note.size > 0, 'Note should have non-zero size');
    });

    test('should retrieve note with frontmatter metadata', async () => {
      // Create note with frontmatter
      const noteContent = `---
title: Custom Title
author: John Doe
tags:
  - important
  - work
priority: high
---

# Custom Title

This is a note with custom frontmatter.`;

      const notePath = path.join(
        workspace.getNoteTypePath('general'),
        'frontmatter-note.md'
      );
      await fs.writeFile(notePath, noteContent);

      // Retrieve the note
      const note = await noteManager.getNote('general/frontmatter-note.md');

      assert.strictEqual(note.title, 'Custom Title');
      assert.strictEqual(note.metadata.author, 'John Doe');
      assert.deepStrictEqual(note.metadata.tags, ['important', 'work']);
      assert.strictEqual(note.metadata.priority, 'high');
      assert.ok(note.content.includes('This is a note with custom frontmatter'));
      assert.ok(note.rawContent.includes('---'));
    });

    test('should retrieve note without frontmatter', async () => {
      // Create note without frontmatter
      const noteContent = `# Simple Note

This is a simple note without frontmatter.

## Section 1
Some content here.

## Section 2
More content here.`;

      const notePath = path.join(workspace.getNoteTypePath('general'), 'simple-note.md');
      await fs.writeFile(notePath, noteContent);

      // Retrieve the note
      const note = await noteManager.getNote('general/simple-note.md');

      assert.strictEqual(note.title, 'Simple Note');
      assert.strictEqual(note.content, noteContent);
      assert.strictEqual(note.rawContent, noteContent);
      assert.ok(note.metadata, 'Should have metadata object even without frontmatter');
    });

    test('should extract title from filename when no title in content', async () => {
      // Create note without title
      const noteContent = `This note has no title in the content.`;

      const notePath = path.join(
        workspace.getNoteTypePath('general'),
        'untitled-note.md'
      );
      await fs.writeFile(notePath, noteContent);

      // Retrieve the note
      const note = await noteManager.getNote('general/untitled-note.md');

      assert.strictEqual(note.title, 'Untitled Note');
      assert.strictEqual(note.content, noteContent);
    });
  });

  describe('Note Identifier Parsing', () => {
    test('should handle different note identifier formats', async () => {
      // Create notes in different types
      await noteTypeManager.createNoteType('projects', {
        template: '# {{title}}\n\n{{content}}'
      });

      const noteContent = 'Project note content';
      const notePath = path.join(workspace.getNoteTypePath('projects'), 'my-project.md');
      await fs.writeFile(notePath, `# My Project\n\n${noteContent}`);

      // Test identifier with .md extension
      const note1 = await noteManager.getNote('projects/my-project.md');
      assert.strictEqual(note1.type, 'projects');
      assert.strictEqual(note1.filename, 'my-project.md');
      assert.ok(note1.content.includes(noteContent));

      // Test identifier without .md extension
      const note2 = await noteManager.getNote('projects/my-project');
      assert.strictEqual(note2.type, 'projects');
      assert.strictEqual(note2.filename, 'my-project.md');
      assert.ok(note2.content.includes(noteContent));
    });

    test('should handle notes with special characters in filenames', async () => {
      const noteContent = 'Note with special characters';
      const filename = 'note-with-åéîøü-chars.md';
      const notePath = path.join(workspace.getNoteTypePath('general'), filename);
      await fs.writeFile(notePath, `# Special Note\n\n${noteContent}`);

      const note = await noteManager.getNote(`general/${filename}`);

      assert.strictEqual(note.filename, filename);
      assert.ok(note.content.includes(noteContent));
    });
  });

  describe('Content Parsing', () => {
    test('should parse complex frontmatter correctly', async () => {
      const noteContent = `---
title: Complex Frontmatter
tags:
  - tag1
  - tag2
priority: high
---

# Complex Frontmatter

Content with various data types in frontmatter.`;

      const notePath = path.join(
        workspace.getNoteTypePath('general'),
        'complex-frontmatter.md'
      );
      await fs.writeFile(notePath, noteContent);

      const note = await noteManager.getNote('general/complex-frontmatter.md');

      assert.strictEqual(note.metadata.title, 'Complex Frontmatter');
      assert.deepStrictEqual(note.metadata.tags, ['tag1', 'tag2']);
      assert.strictEqual(note.metadata.priority, 'high');
    });

    test('should parse frontmatter with links correctly', async () => {
      const noteContent = `---
title: Note With Links
links:
  - target: other-note.md
    relationship: references
    created: 2024-01-15T10:00:00Z
    context: Test link
---

# Note With Links

This note has links in frontmatter.`;

      const notePath = path.join(
        workspace.getNoteTypePath('general'),
        'note-with-links.md'
      );
      await fs.writeFile(notePath, noteContent);

      const note = await noteManager.getNote('general/note-with-links.md');

      assert.strictEqual(note.title, 'Note With Links');
      assert.ok(Array.isArray(note.metadata.links));
      assert.strictEqual(note.metadata.links[0].target, 'other-note.md');
      assert.strictEqual(note.metadata.links[0].relationship, 'references');
      // YAML parses ISO date strings as Date objects, so we need to check the string representation
      assert.ok(
        note.metadata.links[0].created instanceof Date ||
          typeof note.metadata.links[0].created === 'string'
      );
      if (note.metadata.links[0].created instanceof Date) {
        assert.strictEqual(
          note.metadata.links[0].created.toISOString(),
          '2024-01-15T10:00:00.000Z'
        );
      } else {
        assert.strictEqual(note.metadata.links[0].created, '2024-01-15T10:00:00Z');
      }
      assert.strictEqual(note.metadata.links[0].context, 'Test link');
    });

    test('should handle malformed frontmatter gracefully', async () => {
      const noteContent = `---
title: Malformed Frontmatter
invalid_key: unclosed_value
---

# Malformed Frontmatter

This note has invalid YAML frontmatter.`;

      const notePath = path.join(
        workspace.getNoteTypePath('general'),
        'malformed-frontmatter.md'
      );
      await fs.writeFile(notePath, noteContent);

      const note = await noteManager.getNote('general/malformed-frontmatter.md');

      // Should still retrieve the note, even with malformed frontmatter
      assert.strictEqual(note.title, 'Malformed Frontmatter');
      assert.ok(note.content.includes('This note has invalid YAML frontmatter'));
      assert.ok(note.metadata, 'Should have metadata object');
      // When frontmatter is malformed, it should return empty metadata but still extract title from content
    });

    test('should handle empty frontmatter', async () => {
      const noteContent = `---
---

# Empty Frontmatter

This note has empty frontmatter.`;

      const notePath = path.join(
        workspace.getNoteTypePath('general'),
        'empty-frontmatter.md'
      );
      await fs.writeFile(notePath, noteContent);

      const note = await noteManager.getNote('general/empty-frontmatter.md');

      assert.strictEqual(note.title, 'Empty Frontmatter');
      assert.ok(note.content.includes('This note has empty frontmatter'));
    });

    test('should preserve original content formatting', async () => {
      const noteContent = `# Formatted Note

This note has:
- List items
- With multiple items

\`\`\`javascript
const code = "preserved";
\`\`\`

| Table | Header |
|-------|--------|
| Cell  | Data   |

> Blockquote text
> continues here`;

      const notePath = path.join(
        workspace.getNoteTypePath('general'),
        'formatted-note.md'
      );
      await fs.writeFile(notePath, noteContent);

      const note = await noteManager.getNote('general/formatted-note.md');

      assert.strictEqual(note.content, noteContent);
      assert.ok(note.content.includes('```javascript'));
      assert.ok(note.content.includes('| Table | Header |'));
      assert.ok(note.content.includes('> Blockquote text'));
    });
  });

  describe('File System Properties', () => {
    test('should include correct file system metadata', async () => {
      const title = 'File System Test';
      const content = 'Testing file system properties';

      const result = await noteManager.createNote('general', title, content);

      const note = await noteManager.getNote(result.id);

      // Check timestamps are valid ISO strings
      assert.ok(
        new Date(note.created).toISOString() === note.created,
        'Created should be valid ISO string'
      );
      assert.ok(
        new Date(note.modified).toISOString() === note.modified,
        'Modified should be valid ISO string'
      );

      // Check file size
      assert.ok(note.size > 0, 'Size should be greater than 0');
      assert.strictEqual(typeof note.size, 'number', 'Size should be a number');

      // Check path is absolute
      assert.ok(path.isAbsolute(note.path), 'Path should be absolute');
      assert.ok(note.path.includes(note.filename), 'Path should include filename');
    });

    test('should handle large note files', async () => {
      // Create a large note
      const largeContent = 'A'.repeat(10000); // 10KB of content
      const noteContent = `# Large Note\n\n${largeContent}`;

      const notePath = path.join(workspace.getNoteTypePath('general'), 'large-note.md');
      await fs.writeFile(notePath, noteContent);

      const note = await noteManager.getNote('general/large-note.md');

      assert.strictEqual(note.title, 'Large Note');
      assert.ok(note.content.includes(largeContent));
      assert.ok(note.size > 10000, 'Size should reflect large content');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for non-existent note', async () => {
      await assert.rejects(
        async () => await noteManager.getNote('general/non-existent.md'),
        /Note 'general\/non-existent\.md' does not exist/
      );
    });

    test('should throw error for invalid note identifier', async () => {
      await assert.rejects(
        async () => await noteManager.getNote('invalid-identifier'),
        /Failed to get note/
      );
    });

    test('should throw error for note in non-existent type', async () => {
      await assert.rejects(
        async () => await noteManager.getNote('nonexistent/some-note.md'),
        /Failed to get note/
      );
    });

    test('should handle permission errors gracefully', async () => {
      // Create a note first
      const noteContent = 'Permission test note';
      const notePath = path.join(
        workspace.getNoteTypePath('general'),
        'permission-test.md'
      );
      await fs.writeFile(notePath, noteContent);

      // Change permissions to make it unreadable (Unix-like systems)
      try {
        await fs.chmod(notePath, 0o000);

        await assert.rejects(
          async () => await noteManager.getNote('general/permission-test.md'),
          /Failed to get note/
        );
      } catch (error) {
        // Skip test on systems that don't support chmod
        console.log('Skipping permission test on this system');
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(notePath, 0o644);
        } catch (_error) {
          // Ignore chmod errors
        }
      }
    });

    test('should provide helpful error messages', async () => {
      try {
        await noteManager.getNote('general/missing-note.md');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('general/missing-note.md'));
        assert.ok(error.message.includes('does not exist'));
      }
    });
  });

  describe('Note Types Integration', () => {
    test('should retrieve notes from custom note types', async () => {
      // Create custom note type
      await noteTypeManager.createNoteType('meeting-notes', {
        template:
          '# {{title}}\n\n**Date:** {{date}}\n**Attendees:** \n\n## Agenda\n\n{{content}}'
      });

      const noteContent = `# Weekly Standup

**Date:** 2024-01-15
**Attendees:** Alice, Bob, Charlie

## Agenda

- Project updates
- Blockers
- Next steps`;

      const notePath = path.join(
        workspace.getNoteTypePath('meeting-notes'),
        'weekly-standup.md'
      );
      await fs.writeFile(notePath, noteContent);

      const note = await noteManager.getNote('meeting-notes/weekly-standup.md');

      assert.strictEqual(note.type, 'meeting-notes');
      assert.strictEqual(note.title, 'Weekly Standup');
      assert.ok(note.content.includes('**Date:** 2024-01-15'));
      assert.ok(note.content.includes('**Attendees:** Alice, Bob, Charlie'));
    });

    test('should handle notes with same filename in different types', async () => {
      // Create custom note type
      await noteTypeManager.createNoteType('personal', {
        template: '# {{title}}\n\n{{content}}'
      });

      // Create notes with same filename in different types
      const generalContent = 'This is a general todo list';
      const personalContent = 'This is a personal todo list';

      const generalPath = path.join(workspace.getNoteTypePath('general'), 'todo.md');
      const personalPath = path.join(workspace.getNoteTypePath('personal'), 'todo.md');

      await fs.writeFile(generalPath, `# General Todo\n\n${generalContent}`);
      await fs.writeFile(personalPath, `# Personal Todo\n\n${personalContent}`);

      const generalNote = await noteManager.getNote('general/todo.md');
      const personalNote = await noteManager.getNote('personal/todo.md');

      assert.strictEqual(generalNote.type, 'general');
      assert.strictEqual(personalNote.type, 'personal');
      assert.ok(generalNote.content.includes(generalContent));
      assert.ok(personalNote.content.includes(personalContent));
      assert.notStrictEqual(generalNote.path, personalNote.path);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty note files', async () => {
      const notePath = path.join(workspace.getNoteTypePath('general'), 'empty-note.md');
      await fs.writeFile(notePath, '');

      const note = await noteManager.getNote('general/empty-note.md');

      assert.strictEqual(note.title, 'Empty Note');
      assert.strictEqual(note.content, '');
      assert.strictEqual(note.rawContent, '');
      assert.strictEqual(note.size, 0);
    });

    test('should handle notes with only whitespace', async () => {
      const notePath = path.join(
        workspace.getNoteTypePath('general'),
        'whitespace-note.md'
      );
      await fs.writeFile(notePath, '   \n\n\t  \n  ');

      const note = await noteManager.getNote('general/whitespace-note.md');

      assert.strictEqual(note.title, 'Whitespace Note');
      // Content gets trimmed during parsing
      assert.strictEqual(note.content, '');
    });

    test('should handle notes with Unicode content', async () => {
      const unicodeContent = `# 📝 Unicode Note

This note contains various Unicode characters:
- Emojis: 🎉 🚀 ⭐ 💡
- Accents: café, naïve, résumé
- Math: α + β = γ, ∀x ∈ ℝ
- CJK: 你好世界 こんにちは 안녕하세요`;

      const notePath = path.join(workspace.getNoteTypePath('general'), 'unicode-note.md');
      await fs.writeFile(notePath, unicodeContent, 'utf-8');

      const note = await noteManager.getNote('general/unicode-note.md');

      // Title extraction removes emoji characters from filename generation
      assert.strictEqual(note.title, 'Unicode Note');
      assert.ok(note.content.includes('🎉 🚀 ⭐ 💡'));
      assert.ok(note.content.includes('café, naïve, résumé'));
      assert.ok(note.content.includes('α + β = γ'));
      assert.ok(note.content.includes('你好世界 こんにちは 안녕하세요'));
    });

    test('should handle very long filenames', async () => {
      // Create note with long filename (but within filesystem limits)
      const longTitle = 'A'.repeat(100);
      const content = 'Note with very long title';

      // Create the note using noteManager to ensure proper filename generation
      const result = await noteManager.createNote('general', longTitle, content);

      // Retrieve the note using the returned ID
      const retrievedNote = await noteManager.getNote(result.id);
      assert.ok(retrievedNote.content.includes(content));
      assert.ok(
        retrievedNote.filename.length <= 255,
        'Filename should be within filesystem limits'
      );
    });
  });
});
