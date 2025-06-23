/**
 * Consolidated Link Integration Tests
 *
 * Tests link functionality including creation, storage, retrieval, and debugging.
 * Consolidates link-notes-integration.test.ts and link-debug.test.ts
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  createIntegrationTestContext,
  cleanupIntegrationTestContext,
  MCPIntegrationClient,
  IntegrationTestAssertions
} from './helpers/integration-utils.ts';
import type { IntegrationTestContext } from './helpers/integration-utils.ts';

describe('Consolidated Link Integration Tests', () => {
  let context: IntegrationTestContext;
  let mcpClient: MCPIntegrationClient | null = null;

  beforeEach(async () => {
    context = await createIntegrationTestContext('links-consolidated');

    // Create basic test notes for linking
    await context.noteManager.createNote('general', 'Note A', 'Content of note A');
    await context.noteManager.createNote('general', 'Note B', 'Content of note B');
    await context.noteManager.createNote('projects', 'Project Note', 'Project content');
  });

  afterEach(async () => {
    if (mcpClient) {
      await mcpClient.stop();
      mcpClient = null;
    }
    await cleanupIntegrationTestContext(context);
  });

  describe('Direct Link Manager Tests', () => {
    describe('Basic Link Creation', () => {
      test('should create bidirectional references link', async () => {
        const result = await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references',
          bidirectional: true
        });

        assert.ok(result.success, 'Link creation should succeed');
        assert.strictEqual(
          result.source,
          'general/note-a.md',
          'Should have correct source'
        );
        assert.strictEqual(
          result.target,
          'general/note-b.md',
          'Should have correct target'
        );
        assert.strictEqual(
          result.relationship,
          'references',
          'Should have correct relationship'
        );
      });

      test('should create unidirectional mentions link', async () => {
        const result = await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'projects/project-note.md',
          relationship: 'mentions',
          bidirectional: false
        });

        assert.ok(result.success, 'Unidirectional link should succeed');
        assert.strictEqual(
          result.relationship,
          'mentions',
          'Should have mentions relationship'
        );
      });

      test('should handle default parameters', async () => {
        const result = await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md'
        });

        assert.ok(result.success, 'Link with defaults should succeed');
        assert.strictEqual(
          result.relationship,
          'references',
          'Should default to references'
        );
        // Default bidirectional should be true
      });

      test('should validate relationship types', async () => {
        const validRelationships = ['references', 'mentions', 'depends-on', 'related-to'];

        for (const relationship of validRelationships) {
          const result = await context.linkManager.linkNotes({
            source: 'general/note-a.md',
            target: 'general/note-b.md',
            relationship: relationship as any
          });

          assert.ok(result.success, `Should accept ${relationship} relationship`);
        }
      });

      test('should reject invalid relationship type', async () => {
        try {
          await context.linkManager.linkNotes({
            source: 'general/note-a.md',
            target: 'general/note-b.md',
            relationship: 'invalid-relationship' as any
          });
          assert.fail('Should reject invalid relationship');
        } catch (error) {
          assert.ok(
            error.message.includes('Invalid relationship'),
            'Should indicate invalid relationship'
          );
        }
      });
    });

    describe('Link Storage and Metadata', () => {
      test('should store links in note metadata', async () => {
        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references',
          bidirectional: true
        });

        // Check source note metadata
        const sourceNote = await context.noteManager.getNote('general/note-a.md');
        assert.ok(sourceNote.metadata.links, 'Source note should have links metadata');
        assert.ok(Array.isArray(sourceNote.metadata.links), 'Links should be array');
        assert.strictEqual(sourceNote.metadata.links.length, 1, 'Should have one link');

        const link = sourceNote.metadata.links[0];
        assert.strictEqual(
          link.target,
          'general/note-b.md',
          'Link should have correct target'
        );
        assert.strictEqual(
          link.relationship,
          'references',
          'Link should have correct relationship'
        );
        assert.ok(link.created, 'Link should have creation timestamp');

        // Check target note metadata (bidirectional)
        const targetNote = await context.noteManager.getNote('general/note-b.md');
        assert.ok(targetNote.metadata.links, 'Target note should have links metadata');
        assert.strictEqual(
          targetNote.metadata.links.length,
          1,
          'Target should have one link'
        );
        assert.strictEqual(
          targetNote.metadata.links[0].target,
          'general/note-a.md',
          'Reverse link should exist'
        );
      });

      test('should add inline wikilinks to content', async () => {
        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references'
        });

        const sourceNote = await context.noteManager.getNote('general/note-a.md');
        assert.ok(
          sourceNote.content.includes('[[Note B]]'),
          'Should add wikilink to content'
        );
      });

      test('should preserve existing note content and metadata', async () => {
        // Add some metadata to note A first
        const noteAPath = context.workspace.getNotePath('general', 'note-a.md');
        const existingContent = `---
title: "Note A"
tags: ["existing", "test"]
priority: "high"
---

# Note A

Content of note A with existing metadata.`;

        await fs.writeFile(noteAPath, existingContent);

        // Now create a link
        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references'
        });

        // Check that existing metadata is preserved
        const updatedNote = await context.noteManager.getNote('general/note-a.md');
        assert.ok(updatedNote.metadata.tags, 'Should preserve existing tags');
        assert.strictEqual(
          updatedNote.metadata.priority,
          'high',
          'Should preserve existing metadata'
        );
        assert.ok(updatedNote.metadata.links, 'Should add links metadata');
        assert.ok(
          updatedNote.content.includes('existing metadata'),
          'Should preserve content'
        );
      });
    });

    describe('Duplicate Link Prevention', () => {
      test('should prevent duplicate links with same relationship', async () => {
        // Create first link
        const result1 = await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references'
        });

        assert.ok(result1.success, 'First link should succeed');

        // Try to create duplicate
        const result2 = await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references'
        });

        assert.ok(!result2.success, 'Duplicate link should fail');
        assert.ok(
          result2.message.includes('already exists'),
          'Should indicate link exists'
        );
      });

      test('should allow different relationships between same notes', async () => {
        // Create references link
        const result1 = await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references'
        });

        assert.ok(result1.success, 'References link should succeed');

        // Create mentions link between same notes
        const result2 = await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'mentions'
        });

        assert.ok(result2.success, 'Different relationship should succeed');

        // Verify both links exist
        const sourceNote = await context.noteManager.getNote('general/note-a.md');
        assert.strictEqual(sourceNote.metadata.links.length, 2, 'Should have both links');

        const relationships = sourceNote.metadata.links.map(link => link.relationship);
        assert.ok(relationships.includes('references'), 'Should have references link');
        assert.ok(relationships.includes('mentions'), 'Should have mentions link');
      });
    });

    describe('Complex Link Scenarios', () => {
      test('should handle multiple links from one note', async () => {
        // Create additional target notes
        await context.noteManager.createNote('general', 'Note C', 'Content of note C');
        await context.noteManager.createNote('general', 'Note D', 'Content of note D');

        // Create multiple links from Note A
        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references'
        });

        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-c.md',
          relationship: 'mentions'
        });

        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-d.md',
          relationship: 'depends-on'
        });

        // Verify all links exist
        const sourceNote = await context.noteManager.getNote('general/note-a.md');
        assert.strictEqual(
          sourceNote.metadata.links.length,
          3,
          'Should have three links'
        );

        const targets = sourceNote.metadata.links.map(link => link.target);
        assert.ok(targets.includes('general/note-b.md'), 'Should link to Note B');
        assert.ok(targets.includes('general/note-c.md'), 'Should link to Note C');
        assert.ok(targets.includes('general/note-d.md'), 'Should link to Note D');
      });

      test('should handle bidirectional link network', async () => {
        // Create additional notes
        await context.noteManager.createNote('general', 'Note C', 'Content of note C');

        // Create network: A <-> B <-> C <-> A
        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references',
          bidirectional: true
        });

        await context.linkManager.linkNotes({
          source: 'general/note-b.md',
          target: 'general/note-c.md',
          relationship: 'references',
          bidirectional: true
        });

        await context.linkManager.linkNotes({
          source: 'general/note-c.md',
          target: 'general/note-a.md',
          relationship: 'references',
          bidirectional: true
        });

        // Verify network connectivity
        const noteA = await context.noteManager.getNote('general/note-a.md');
        const noteB = await context.noteManager.getNote('general/note-b.md');
        const noteC = await context.noteManager.getNote('general/note-c.md');

        assert.strictEqual(noteA.metadata.links.length, 2, 'Note A should have 2 links');
        assert.strictEqual(noteB.metadata.links.length, 2, 'Note B should have 2 links');
        assert.strictEqual(noteC.metadata.links.length, 2, 'Note C should have 2 links');
      });

      test('should maintain link integrity across note updates', async () => {
        // Create link
        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references',
          bidirectional: true
        });

        // Update note content
        await context.noteManager.updateNote(
          'general/note-a.md',
          'Updated content for note A'
        );

        // Verify links are maintained
        const updatedNote = await context.noteManager.getNote('general/note-a.md');
        assert.ok(updatedNote.metadata.links, 'Links should be maintained after update');
        assert.strictEqual(
          updatedNote.metadata.links.length,
          1,
          'Should still have the link'
        );
        assert.ok(
          updatedNote.content.includes('Updated content'),
          'Should have updated content'
        );
      });
    });

    describe('Error Handling', () => {
      test('should handle non-existent source note', async () => {
        try {
          await context.linkManager.linkNotes({
            source: 'general/nonexistent.md',
            target: 'general/note-b.md',
            relationship: 'references'
          });
          assert.fail('Should throw error for non-existent source');
        } catch (error) {
          assert.ok(
            error.message.includes('not found'),
            'Should indicate source not found'
          );
        }
      });

      test('should handle non-existent target note', async () => {
        try {
          await context.linkManager.linkNotes({
            source: 'general/note-a.md',
            target: 'general/nonexistent.md',
            relationship: 'references'
          });
          assert.fail('Should throw error for non-existent target');
        } catch (error) {
          assert.ok(
            error.message.includes('not found'),
            'Should indicate target not found'
          );
        }
      });

      test('should validate required parameters', async () => {
        try {
          await context.linkManager.linkNotes({
            source: 'general/note-a.md'
            // Missing target
          } as any);
          assert.fail('Should require target parameter');
        } catch (error) {
          assert.ok(error.message.includes('target'), 'Should indicate missing target');
        }
      });
    });
  });

  describe('MCP Link Integration', () => {
    beforeEach(async () => {
      mcpClient = new MCPIntegrationClient(context.tempDir);
      await mcpClient.start();
    });

    describe('MCP Link Creation', () => {
      test('should create links via MCP protocol', async () => {
        const response = await mcpClient!.callTool('link_notes', {
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references',
          bidirectional: true
        });

        const result = JSON.parse(response.content[0].text);
        IntegrationTestAssertions.assertLinkCreationResponse(result);
      });

      test('should handle MCP link creation with context', async () => {
        const response = await mcpClient!.callTool('link_notes', {
          source: 'general/note-a.md',
          target: 'projects/project-note.md',
          relationship: 'related-to',
          bidirectional: false,
          context: 'Related to project implementation'
        });

        const result = JSON.parse(response.content[0].text);
        assert.ok(result.success, 'Link with context should succeed');

        // Verify context is stored
        const sourceNote = await context.noteManager.getNote('general/note-a.md');
        const link = sourceNote.metadata.links.find(
          l => l.target === 'projects/project-note.md'
        );
        assert.ok(link, 'Link should exist');
        assert.strictEqual(
          link.context,
          'Related to project implementation',
          'Should store context'
        );
      });

      test('should handle MCP link errors', async () => {
        try {
          await mcpClient!.callTool('link_notes', {
            source: 'general/nonexistent.md',
            target: 'general/note-b.md',
            relationship: 'references'
          });
          assert.fail('Should throw error for invalid link via MCP');
        } catch (error) {
          assert.ok(error.message.includes('not found'), 'Should indicate error via MCP');
        }
      });
    });

    describe('Link Querying via MCP', () => {
      beforeEach(async () => {
        // Set up some test links
        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'general/note-b.md',
          relationship: 'references',
          bidirectional: true
        });

        await context.linkManager.linkNotes({
          source: 'general/note-a.md',
          target: 'projects/project-note.md',
          relationship: 'mentions',
          bidirectional: false
        });
      });

      test('should retrieve note with links via get_note', async () => {
        const response = await mcpClient!.callTool('get_note', {
          id: 'general/note-a.md'
        });

        const note = JSON.parse(response.content[0].text);
        assert.ok(note.metadata.links, 'Note should include links metadata');
        assert.ok(Array.isArray(note.metadata.links), 'Links should be array');
        assert.ok(note.metadata.links.length > 0, 'Should have links');
      });

      test('should find linked notes in search results', async () => {
        const response = await mcpClient!.callTool('search_notes', {
          query: 'Note A',
          limit: 10
        });

        const results = JSON.parse(response.content[0].text);
        const noteA = results.find((note: any) => note.title === 'Note A');

        assert.ok(noteA, 'Should find Note A');
        // Content should include wikilinks
        assert.ok(
          noteA.snippet.includes('[[') || noteA.snippet.includes(']]'),
          'Should show wikilinks in search snippets'
        );
      });
    });
  });

  describe('Link Debugging and Diagnostics', () => {
    test('should debug basic link creation and storage', async () => {
      // Create a simple link
      const result = await context.linkManager.linkNotes({
        source: 'general/note-a.md',
        target: 'general/note-b.md',
        relationship: 'references',
        bidirectional: true
      });

      assert.ok(result.success, 'Link creation should succeed');

      // Check what happened to the notes
      const updatedNoteA = await context.noteManager.getNote('general/note-a.md');
      const updatedNoteB = await context.noteManager.getNote('general/note-b.md');

      // Debug output assertions
      assert.ok(updatedNoteA.metadata.links, 'Note A should have links metadata');
      assert.ok(updatedNoteB.metadata.links, 'Note B should have links metadata');

      // Check the actual files on disk
      const filePathA = context.workspace.getNotePath('general', 'note-a.md');
      const filePathB = context.workspace.getNotePath('general', 'note-b.md');

      const fileContentA = await fs.readFile(filePathA, 'utf-8');
      const fileContentB = await fs.readFile(filePathB, 'utf-8');

      assert.ok(
        fileContentA.includes('links:'),
        'File A should contain links in frontmatter'
      );
      assert.ok(
        fileContentB.includes('links:'),
        'File B should contain links in frontmatter'
      );
      assert.ok(fileContentA.includes('[[Note B]]'), 'File A should contain wikilink');
    });

    test('should debug frontmatter parsing with links', async () => {
      // Create a note with frontmatter manually
      const noteWithFrontmatter = `---
title: "Test Note"
type: "general"
tags: ["test"]
---

# Test Note

This is a test note with frontmatter.`;

      const testNotePath = context.workspace.getNotePath(
        'general',
        'frontmatter-test.md'
      );
      await fs.writeFile(testNotePath, noteWithFrontmatter);

      // Read and verify parsing
      const parsedNote = await context.noteManager.getNote('general/frontmatter-test.md');
      assert.deepStrictEqual(
        parsedNote.metadata.tags,
        ['test'],
        'Should parse existing tags'
      );

      // Add links to note with existing frontmatter
      const result = await context.linkManager.linkNotes({
        source: 'general/frontmatter-test.md',
        target: 'general/note-a.md',
        relationship: 'references',
        bidirectional: false
      });

      assert.ok(result.success, 'Link should succeed with existing frontmatter');

      // Verify frontmatter is properly maintained
      const updatedNote = await context.noteManager.getNote(
        'general/frontmatter-test.md'
      );
      assert.deepStrictEqual(
        updatedNote.metadata.tags,
        ['test'],
        'Should preserve existing tags'
      );
      assert.ok(updatedNote.metadata.links, 'Should add links metadata');
      assert.strictEqual(updatedNote.metadata.links.length, 1, 'Should have one link');

      const updatedFileContent = await fs.readFile(testNotePath, 'utf-8');
      assert.ok(
        updatedFileContent.includes('tags: ["test"]'),
        'Should preserve existing frontmatter'
      );
      assert.ok(updatedFileContent.includes('links:'), 'Should add links to frontmatter');
    });

    test('should debug YAML parsing with manually added links', async () => {
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

      const testNotePath = context.workspace.getNotePath('general', 'links-test.md');
      await fs.writeFile(testNotePath, noteWithLinks);

      // Read and verify link parsing
      const parsedNote = await context.noteManager.getNote('general/links-test.md');
      assert.ok(parsedNote.metadata.links, 'Links should be parsed');
      assert.ok(Array.isArray(parsedNote.metadata.links), 'Links should be an array');
      assert.strictEqual(parsedNote.metadata.links.length, 1, 'Should have one link');

      const link = parsedNote.metadata.links[0];
      assert.strictEqual(
        link.target,
        'general/note-a.md',
        'Link target should be correct'
      );
      assert.strictEqual(
        link.relationship,
        'references',
        'Link relationship should be correct'
      );
      assert.strictEqual(link.context, 'Manual link', 'Link context should be preserved');
      assert.ok(link.created, 'Link should have creation timestamp');
    });

    test('should handle complex frontmatter edge cases', async () => {
      // Test with various YAML edge cases
      const complexNote = `---
title: "Complex Note"
description: |
  Multi-line description
  with special characters: & * | > < ! @ # $ %
tags:
  - "tag with spaces"
  - tag-with-dashes
  - "tag:with:colons"
metadata:
  nested:
    property: "value"
  array: [1, 2, 3]
---

# Complex Note

This note tests complex YAML parsing.`;

      const complexPath = context.workspace.getNotePath('general', 'complex-test.md');
      await fs.writeFile(complexPath, complexNote);

      // Add link to complex note
      const result = await context.linkManager.linkNotes({
        source: 'general/complex-test.md',
        target: 'general/note-a.md',
        relationship: 'references'
      });

      assert.ok(result.success, 'Should handle complex frontmatter');

      // Verify complex metadata is preserved
      const updatedNote = await context.noteManager.getNote('general/complex-test.md');
      assert.ok(
        updatedNote.metadata.description.includes('Multi-line'),
        'Should preserve multiline'
      );
      assert.ok(
        updatedNote.metadata.tags.includes('tag with spaces'),
        'Should preserve complex tags'
      );
      assert.ok(
        updatedNote.metadata.metadata.nested.property === 'value',
        'Should preserve nested objects'
      );
      assert.ok(updatedNote.metadata.links, 'Should add links');
    });
  });
});
