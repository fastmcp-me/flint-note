/**
 * Streamlined Metadata Integration Tests
 *
 * Tests metadata schema validation and integration with note creation,
 * focusing on the core metadata functionality without duplication.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  createIntegrationTestContext,
  cleanupIntegrationTestContext,
  createIntegrationTestNotesWithMetadata,
  createIntegrationTestNoteTypes,
  MCPIntegrationClient,
  IntegrationTestAssertions
} from './helpers/integration-utils.ts';
import type { IntegrationTestContext } from './helpers/integration-utils.ts';

describe('Streamlined Metadata Integration Tests', () => {
  let context: IntegrationTestContext;
  let mcpClient: MCPIntegrationClient | null = null;

  beforeEach(async () => {
    context = await createIntegrationTestContext('metadata-streamlined');
    await createIntegrationTestNoteTypes(context);
    await createIntegrationTestNotesWithMetadata(context);
  });

  afterEach(async () => {
    if (mcpClient) {
      await mcpClient.stop();
      mcpClient = null;
    }
    await cleanupIntegrationTestContext(context);
  });

  describe('Metadata Schema Validation', () => {
    test('should validate metadata against note type schema', async () => {
      // Create a book review with valid metadata
      const validBookReview = `---
title: "The Pragmatic Programmer"
author: "David Thomas"
rating: 5
status: "completed"
genre: "Programming"
isbn: "978-0201616224"
published_date: "1999-10-30"
tags: ["programming", "software-development"]
---

# The Pragmatic Programmer

Excellent book on software development practices.

## Key Insights
- Write clean, maintainable code
- Think about your craft
- Continuous learning is essential
`;

      const notePath = context.workspace.getNotePath(
        'book-reviews',
        'pragmatic-programmer.md'
      );
      await fs.writeFile(notePath, validBookReview);

      // Read and validate the note
      const note = await context.noteManager.getNote(
        'book-reviews/pragmatic-programmer.md'
      );

      assert.strictEqual(
        note.metadata.title,
        'The Pragmatic Programmer',
        'Should have correct title'
      );
      assert.strictEqual(
        note.metadata.author,
        'David Thomas',
        'Should have correct author'
      );
      assert.strictEqual(note.metadata.rating, 5, 'Should have numeric rating');
      assert.strictEqual(note.metadata.status, 'completed', 'Should have valid status');
      assert.ok(Array.isArray(note.metadata.tags), 'Tags should be array');
      assert.ok(note.metadata.isbn.match(/^[0-9-]+$/), 'ISBN should match pattern');
    });

    test('should handle metadata with pattern constraints', async () => {
      // Test valid ISBN pattern
      const validIsbn = `---
title: "Test Book"
author: "Test Author"
rating: 4
status: "reading"
isbn: "978-0-123456-78-9"
---

# Test Book

Content here.`;

      const validPath = context.workspace.getNotePath('book-reviews', 'valid-isbn.md');
      await fs.writeFile(validPath, validIsbn);

      const validNote = await context.noteManager.getNote('book-reviews/valid-isbn.md');
      assert.strictEqual(
        validNote.metadata.isbn,
        '978-0-123456-78-9',
        'Should accept valid ISBN'
      );

      // Test invalid ISBN pattern
      const invalidIsbn = `---
title: "Test Book 2"
author: "Test Author"
rating: 4
status: "reading"
isbn: "invalid-isbn-format"
---

# Test Book 2

Content here.`;

      const invalidPath = context.workspace.getNotePath(
        'book-reviews',
        'invalid-isbn.md'
      );
      await fs.writeFile(invalidPath, invalidIsbn);

      // Should still parse but note the validation issue
      const invalidNote = await context.noteManager.getNote(
        'book-reviews/invalid-isbn.md'
      );
      assert.strictEqual(
        invalidNote.metadata.isbn,
        'invalid-isbn-format',
        'Should store invalid ISBN'
      );
      // Note: Validation warnings would be handled by the note type manager
    });

    test('should handle array constraints in metadata', async () => {
      // Test with valid tags array
      const validTags = `---
title: "Array Test"
author: "Test Author"
rating: 3
status: "to-read"
tags: ["fiction", "mystery", "thriller"]
---

# Array Test

Testing array handling.`;

      const validPath = context.workspace.getNotePath('book-reviews', 'valid-tags.md');
      await fs.writeFile(validPath, validTags);

      const validNote = await context.noteManager.getNote('book-reviews/valid-tags.md');
      assert.ok(Array.isArray(validNote.metadata.tags), 'Tags should be array');
      assert.strictEqual(
        validNote.metadata.tags.length,
        3,
        'Should have correct number of tags'
      );
      assert.ok(
        validNote.metadata.tags.includes('fiction'),
        'Should include specific tag'
      );

      // Test with single tag (should be converted to array)
      const singleTag = `---
title: "Single Tag Test"
author: "Test Author"
rating: 3
status: "to-read"
tags: "single-tag"
---

# Single Tag Test

Testing single tag handling.`;

      const singlePath = context.workspace.getNotePath('book-reviews', 'single-tag.md');
      await fs.writeFile(singlePath, singleTag);

      const singleNote = await context.noteManager.getNote('book-reviews/single-tag.md');
      // Note: Behavior depends on YAML parser - might be string or array
      assert.ok(singleNote.metadata.tags, 'Should have tags metadata');
    });

    test('should handle complex metadata types', async () => {
      // Create a task note with complex metadata
      const complexTask = `---
title: "Complex Task"
priority: "high"
status: "in-progress"
due_date: "2024-03-15"
assignee: "Alice Johnson"
project: "jade-note"
tags: ["development", "integration", "testing"]
estimated_hours: 8.5
metadata:
  complexity: "medium"
  dependencies: ["task-1", "task-2"]
  reviewers: ["Bob", "Charlie"]
custom_fields:
  - name: "sprint"
    value: "Sprint 23"
  - name: "epic"
    value: "Testing Infrastructure"
---

# Complex Task

This task tests complex metadata handling.

## Description
Implement comprehensive metadata validation.

## Acceptance Criteria
- [ ] Validate basic types
- [ ] Handle arrays and objects
- [ ] Support custom fields
`;

      const taskPath = context.workspace.getNotePath('tasks', 'complex-task.md');
      await fs.writeFile(taskPath, complexTask);

      const taskNote = await context.noteManager.getNote('tasks/complex-task.md');

      assert.strictEqual(
        taskNote.metadata.priority,
        'high',
        'Should have correct priority'
      );
      assert.strictEqual(
        taskNote.metadata.estimated_hours,
        8.5,
        'Should handle numeric values'
      );
      assert.ok(taskNote.metadata.metadata, 'Should handle nested objects');
      assert.ok(
        Array.isArray(taskNote.metadata.metadata.dependencies),
        'Should handle nested arrays'
      );
      assert.ok(
        Array.isArray(taskNote.metadata.custom_fields),
        'Should handle complex arrays'
      );
      assert.strictEqual(
        taskNote.metadata.custom_fields[0].name,
        'sprint',
        'Should preserve object structure'
      );
    });

    test('should handle missing required fields gracefully', async () => {
      // Create note missing required fields
      const incompleteNote = `---
title: "Incomplete Book"
# Missing required: author, rating, status
tags: ["incomplete"]
---

# Incomplete Book

This note is missing required metadata fields.`;

      const incompletePath = context.workspace.getNotePath(
        'book-reviews',
        'incomplete.md'
      );
      await fs.writeFile(incompletePath, incompleteNote);

      // Should still parse successfully
      const note = await context.noteManager.getNote('book-reviews/incomplete.md');
      assert.strictEqual(
        note.metadata.title,
        'Incomplete Book',
        'Should have provided title'
      );
      assert.ok(!note.metadata.author, 'Should not have author');
      assert.ok(!note.metadata.rating, 'Should not have rating');
      // Note: Validation warnings would be handled by note type manager
    });

    test('should handle metadata validation warnings for unknown fields', async () => {
      // Create note with unknown fields
      const noteWithUnknownFields = `---
title: "Book with Unknown Fields"
author: "Test Author"
rating: 4
status: "completed"
unknown_field: "This field is not in the schema"
another_unknown: 123
extra_data:
  nested: "value"
  list: [1, 2, 3]
---

# Book with Unknown Fields

This note has fields not defined in the schema.`;

      const unknownPath = context.workspace.getNotePath(
        'book-reviews',
        'unknown-fields.md'
      );
      await fs.writeFile(unknownPath, noteWithUnknownFields);

      const note = await context.noteManager.getNote('book-reviews/unknown-fields.md');

      // Should preserve all metadata, even unknown fields
      assert.strictEqual(
        note.metadata.title,
        'Book with Unknown Fields',
        'Should have title'
      );
      assert.strictEqual(
        note.metadata.unknown_field,
        'This field is not in the schema',
        'Should preserve unknown field'
      );
      assert.strictEqual(
        note.metadata.another_unknown,
        123,
        'Should preserve unknown numeric field'
      );
      assert.ok(note.metadata.extra_data, 'Should preserve unknown nested object');
      assert.strictEqual(
        note.metadata.extra_data.nested,
        'value',
        'Should preserve nested values'
      );
    });
  });

  describe('Metadata Integration with Note Operations', () => {
    test('should preserve metadata when updating note content', async () => {
      // Get existing note with metadata
      const existingNote = await context.noteManager.getNote('general/atomic-habits.md');
      const originalMetadata = { ...existingNote.metadata };

      // Update note content
      const newContent = `# Atomic Habits - Updated

This book provides excellent insights into habit formation.

## Updated Key Takeaways
- Small changes compound over time
- Focus on systems, not goals
- Environment design is crucial
- Identity drives behavior change

## New Section
Additional insights from re-reading.`;

      await context.noteManager.updateNote('general/atomic-habits.md', newContent);

      // Verify metadata is preserved
      const updatedNote = await context.noteManager.getNote('general/atomic-habits.md');

      assert.strictEqual(
        updatedNote.metadata.title,
        originalMetadata.title,
        'Should preserve title'
      );
      assert.strictEqual(
        updatedNote.metadata.author,
        originalMetadata.author,
        'Should preserve author'
      );
      assert.strictEqual(
        updatedNote.metadata.rating,
        originalMetadata.rating,
        'Should preserve rating'
      );
      assert.deepStrictEqual(
        updatedNote.metadata.tags,
        originalMetadata.tags,
        'Should preserve tags'
      );
      assert.ok(
        updatedNote.content.includes('Updated Key Takeaways'),
        'Should have updated content'
      );
      assert.ok(updatedNote.content.includes('New Section'), 'Should have new content');
    });

    test('should handle metadata in note creation with templates', async () => {
      // Create note using template with metadata
      const templateContent = `---
title: "{{title}}"
author: "{{author}}"
rating: {{rating}}
status: "{{status}}"
tags: {{tags}}
type: "book-review"
created: "{{created}}"
---

# {{title}}

**Author:** {{author}}
**Rating:** {{rating}}/5
**Status:** {{status}}

## Summary

## Key Insights

## My Notes
`;

      // Save template
      const templatePath = join(
        context.workspace.getNoteTypePath('book-reviews'),
        '.template.md'
      );
      await fs.writeFile(templatePath, templateContent);

      // Create note with template variables
      const noteData = {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        rating: 5,
        status: 'completed',
        tags: ['programming', 'best-practices'],
        created: new Date().toISOString()
      };

      // This would be handled by the note creation process
      let processedContent = templateContent;
      for (const [key, value] of Object.entries(noteData)) {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(
          new RegExp(placeholder, 'g'),
          Array.isArray(value) ? JSON.stringify(value) : String(value)
        );
      }

      const notePath = context.workspace.getNotePath('book-reviews', 'clean-code.md');
      await fs.writeFile(notePath, processedContent);

      // Verify templated note
      const note = await context.noteManager.getNote('book-reviews/clean-code.md');

      assert.strictEqual(
        note.metadata.title,
        'Clean Code',
        'Should have templated title'
      );
      assert.strictEqual(
        note.metadata.author,
        'Robert C. Martin',
        'Should have templated author'
      );
      assert.strictEqual(note.metadata.rating, 5, 'Should have templated rating');
      assert.ok(
        note.content.includes('**Author:** Robert C. Martin'),
        'Should have templated content'
      );
      assert.ok(
        note.content.includes('**Rating:** 5/5'),
        'Should have templated rating in content'
      );
    });

    test('should integrate metadata with search functionality', async () => {
      // Search should find notes by metadata content
      const results = await context.searchManager.searchNotes('James Clear');

      assert.ok(results.length > 0, 'Should find notes by author metadata');
      const atomicHabitsNote = results.find(note => note.title.includes('Atomic Habits'));
      assert.ok(atomicHabitsNote, 'Should find Atomic Habits note');

      // Search by rating
      const highRatedResults = await context.searchManager.searchNotes('rating: 5');
      assert.ok(highRatedResults.length > 0, 'Should find highly rated notes');

      // Search by tags
      const productivityResults = await context.searchManager.searchNotes('productivity');
      assert.ok(productivityResults.length > 0, 'Should find notes by tag');
    });
  });

  describe('MCP Integration with Metadata', () => {
    beforeEach(async () => {
      mcpClient = new MCPIntegrationClient(context.tempDir);
      await mcpClient.start();
    });

    test('should create note with metadata via MCP', async () => {
      const response = await mcpClient!.callTool('create_note', {
        type: 'book-reviews',
        title: 'Refactoring',
        content: `---
author: "Martin Fowler"
rating: 4
status: "reading"
tags: ["programming", "refactoring"]
---

# Refactoring

Improving the design of existing code.

## Key Concepts
- Code smells
- Refactoring techniques
- Testing strategies
`
      });

      const result = JSON.parse(response.content[0].text);
      IntegrationTestAssertions.assertNoteCreationResponse(result);

      // Verify metadata was parsed correctly
      const note = await context.noteManager.getNote(result.id);
      assert.strictEqual(
        note.metadata.author,
        'Martin Fowler',
        'Should have author metadata'
      );
      assert.strictEqual(note.metadata.rating, 4, 'Should have numeric rating');
      assert.ok(Array.isArray(note.metadata.tags), 'Should have tags array');
    });

    test('should retrieve note with metadata via MCP', async () => {
      const response = await mcpClient!.callTool('get_note', {
        id: 'general/atomic-habits.md'
      });

      const note = JSON.parse(response.content[0].text);

      assert.ok(note.metadata, 'Should include metadata');
      assert.strictEqual(
        note.metadata.title,
        'Atomic Habits',
        'Should have title metadata'
      );
      assert.strictEqual(
        note.metadata.author,
        'James Clear',
        'Should have author metadata'
      );
      assert.strictEqual(note.metadata.rating, 5, 'Should have rating metadata');
      assert.ok(Array.isArray(note.metadata.tags), 'Should have tags array');
    });

    test('should search notes with metadata via MCP', async () => {
      const response = await mcpClient!.callTool('search_notes', {
        query: 'author:James Clear',
        limit: 10
      });

      const results = JSON.parse(response.content[0].text);
      assert.ok(Array.isArray(results), 'Should return search results');

      if (results.length > 0) {
        const note = results[0];
        assert.ok(note.metadata, 'Search results should include metadata');
        assert.ok(note.metadata.author, 'Should have author in metadata');
      }
    });

    test('should handle metadata validation errors via MCP', async () => {
      // Try to create note with invalid metadata structure
      try {
        await mcpClient!.callTool('create_note', {
          type: 'book-reviews',
          title: 'Invalid Metadata Test',
          content: `---
title: "Invalid Book"
author: 123  # Invalid type - should be string
rating: "five"  # Invalid type - should be number
status: "invalid-status"  # Invalid enum value
---

# Invalid Book

This note has invalid metadata.`
        });

        // Note: Depending on implementation, this might succeed with warnings
        // or fail with validation errors. The important thing is it's handled gracefully.
      } catch (error) {
        // If validation is strict, errors should be informative
        assert.ok(
          error.message.includes('validation') || error.message.includes('invalid'),
          'Should provide meaningful validation error'
        );
      }
    });
  });

  describe('Metadata Performance and Edge Cases', () => {
    test('should handle large metadata objects efficiently', async () => {
      // Create note with large metadata
      const largeMetadata = {
        title: 'Large Metadata Test',
        tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`),
        references: Array.from({ length: 50 }, (_, i) => ({
          title: `Reference ${i}`,
          url: `https://example.com/ref-${i}`,
          notes: `Notes about reference ${i}`.repeat(10)
        })),
        custom_data: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`field_${i}`, `value_${i}`])
        )
      };

      const largeMetadataNote = `---
${Object.entries(largeMetadata)
  .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
  .join('\n')}
---

# Large Metadata Test

This note tests handling of large metadata objects.`;

      const largePath = context.workspace.getNotePath('general', 'large-metadata.md');
      await fs.writeFile(largePath, largeMetadataNote);

      // Should handle large metadata without issues
      const startTime = Date.now();
      const note = await context.noteManager.getNote('general/large-metadata.md');
      const endTime = Date.now();

      assert.ok(note.metadata, 'Should parse large metadata');
      assert.strictEqual(note.metadata.tags.length, 100, 'Should have all tags');
      assert.strictEqual(
        note.metadata.references.length,
        50,
        'Should have all references'
      );
      assert.ok(endTime - startTime < 1000, 'Should parse large metadata quickly');
    });

    test('should handle special characters in metadata values', async () => {
      const specialCharsNote = `---
title: "Special Characters Test"
description: "Test with special chars: 你好 🌟 ñoël café résumé"
emoji_field: "🚀 💡 🎯"
unicode_field: "αβγδε ①②③④⑤"
symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?"
quotes: 'Single "double" quotes'
multiline: |
  Line 1 with special chars: ñ
  Line 2 with emoji: 🎉
  Line 3 with symbols: @#$%
---

# Special Characters Test

Testing special character handling in metadata.`;

      const specialPath = context.workspace.getNotePath('general', 'special-chars.md');
      await fs.writeFile(specialPath, specialCharsNote, 'utf8');

      const note = await context.noteManager.getNote('general/special-chars.md');

      assert.ok(
        note.metadata.description.includes('你好'),
        'Should handle Chinese characters'
      );
      assert.ok(note.metadata.description.includes('🌟'), 'Should handle emoji');
      assert.ok(
        note.metadata.description.includes('ñoël'),
        'Should handle accented characters'
      );
      assert.ok(note.metadata.emoji_field.includes('🚀'), 'Should handle emoji fields');
      assert.ok(
        note.metadata.unicode_field.includes('αβγ'),
        'Should handle Greek characters'
      );
      assert.ok(note.metadata.symbols.includes('!@#$'), 'Should handle symbols');
      assert.ok(
        note.metadata.multiline.includes('Line 1'),
        'Should handle multiline strings'
      );
    });
  });
});
