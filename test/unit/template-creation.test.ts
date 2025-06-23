/**
 * Template-based Note Creation Tests
 *
 * Tests the template functionality for note creation, including
 * variable substitution, template retrieval, and error handling.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  createTestWorkspace,
  cleanupTestWorkspace,
  createTestNoteTypes,
  type TestContext
} from './helpers/test-utils.ts';

describe('Template-based Note Creation', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestWorkspace('template-test');
    await createTestNoteTypes(context);

    // Set up custom template for general note type
    const generalPath = context.workspace.getNoteTypePath('general');
    const descriptionPath = join(generalPath, '_description.md');

    const templateContent = `# General Notes

## Purpose
General-purpose notes for miscellaneous thoughts, ideas, and information.

## Agent Instructions
- Keep notes organized and well-structured
- Extract actionable items when present

## Template (Optional)
# {{title}}

**Created:** {{date}} at {{time}}
**Type:** {{type}}

## Context
Brief context or background information about this note.

## Content
{{content}}

## Related
- Links to related notes

## Actions
- [ ] Any action items extracted from the content

## Metadata Schema (Optional)
Expected frontmatter fields:
- tags: List of relevant tags
`;

    await fs.writeFile(descriptionPath, templateContent, 'utf-8');
  });

  afterEach(async () => {
    await cleanupTestWorkspace(context);
  });

  describe('Template Retrieval', () => {
    test('should get template from general note type', async () => {
      const template = await context.noteTypeManager.getNoteTypeTemplate('general');
      assert(template.includes('{{title}}'), 'Template should contain title variable');
      assert(
        template.includes('{{content}}'),
        'Template should contain content variable'
      );
      assert(template.includes('{{date}}'), 'Template should contain date variable');
    });

    test('should create basic template for note type without template', async () => {
      await context.noteTypeManager.createNoteType(
        'simple',
        'Simple notes without template'
      );
      const template = await context.noteTypeManager.getNoteTypeTemplate('simple');
      assert(template.includes('Simple Note'), 'Should generate basic template');
    });

    test('should handle non-existent note type gracefully', async () => {
      await assert.rejects(
        () => context.noteTypeManager.getNoteTypeTemplate('nonexistent'),
        /does not exist/,
        'Should throw error for non-existent note type'
      );
    });
  });

  describe('Template Processing', () => {
    test('should create note with template variables substituted', async () => {
      const noteInfo = await context.noteManager.createNote(
        'general',
        'Test Template Note',
        'This is the main content of the note.',
        true // use template
      );

      // Read the created note
      const noteContent = await fs.readFile(noteInfo.path, 'utf-8');

      // Check that template variables were substituted
      assert(noteContent.includes('# Test Template Note'), 'Title should be substituted');
      assert(noteContent.includes('**Type:** general'), 'Type should be substituted');
      assert(
        noteContent.includes('This is the main content of the note.'),
        'Content should be included'
      );
      assert(!noteContent.includes('{{title}}'), 'Template variables should be replaced');
      assert(!noteContent.includes('{{type}}'), 'Template variables should be replaced');
    });

    test('should include date and time in template', async () => {
      const noteInfo = await context.noteManager.createNote(
        'general',
        'Date Test Note',
        'Testing date variables.',
        true
      );

      const noteContent = await fs.readFile(noteInfo.path, 'utf-8');
      assert(
        noteContent.includes('**Created:**'),
        'Should include creation date section'
      );

      // Check that date format is reasonable
      const dateMatch = noteContent.match(/\*\*Created:\*\* (.+) at (.+)/);
      assert(dateMatch, 'Should have date and time');
      assert(dateMatch[1].length > 0, 'Date should not be empty');
      assert(dateMatch[2].length > 0, 'Time should not be empty');
    });

    test('should preserve frontmatter when using templates', async () => {
      const noteInfo = await context.noteManager.createNote(
        'general',
        'Frontmatter Test',
        'Content with frontmatter.',
        true
      );

      const noteContent = await fs.readFile(noteInfo.path, 'utf-8');

      // Check frontmatter structure
      assert(noteContent.startsWith('---\n'), 'Should start with frontmatter');
      assert(
        noteContent.includes('title: "Frontmatter Test"'),
        'Should have title in frontmatter'
      );
      assert(noteContent.includes('type: general'), 'Should have type in frontmatter');
      assert(noteContent.includes('created:'), 'Should have created timestamp');
    });
  });

  describe('Template vs Non-Template Comparison', () => {
    test('should create different content with and without template', async () => {
      // Create note without template
      const noteWithoutTemplate = await context.noteManager.createNote(
        'general',
        'No Template Note',
        'Simple content without template.',
        false
      );

      // Create note with template
      const noteWithTemplate = await context.noteManager.createNote(
        'general',
        'With Template Note',
        'Simple content with template.',
        true
      );

      const contentWithoutTemplate = await fs.readFile(noteWithoutTemplate.path, 'utf-8');
      const contentWithTemplate = await fs.readFile(noteWithTemplate.path, 'utf-8');

      // Template version should have more structure
      const withoutTemplateLines = contentWithoutTemplate.split('\n');
      const withTemplateLines = contentWithTemplate.split('\n');

      assert(
        withTemplateLines.length > withoutTemplateLines.length,
        'Template version should have more structure'
      );

      assert(
        !contentWithoutTemplate.includes('## Context'),
        'Non-template should not have template sections'
      );
      assert(
        contentWithTemplate.includes('## Context'),
        'Template version should have template sections'
      );
    });
  });

  describe('Custom Note Type Templates', () => {
    test('should create note type with custom template', async () => {
      const customTemplate = `# {{title}}

**Project:** {{type}}
**Date:** {{date}}

## Objective
What is the goal of this project?

## Tasks
- [ ] Task 1
- [ ] Task 2

## Notes
{{content}}

## Resources
- Links and references`;

      await context.noteTypeManager.createNoteType(
        'project',
        'Project planning and tracking notes',
        customTemplate
      );

      const noteInfo = await context.noteManager.createNote(
        'project',
        'My New Project',
        'This project aims to create something amazing.',
        true
      );

      const noteContent = await fs.readFile(noteInfo.path, 'utf-8');

      assert(noteContent.includes('**Project:** project'), 'Should use custom template');
      assert(noteContent.includes('## Objective'), 'Should have custom sections');
      assert(noteContent.includes('## Tasks'), 'Should have task section');
      assert(
        noteContent.includes('This project aims to create something amazing.'),
        'Should include user content'
      );
    });

    test('should handle template with missing variables gracefully', async () => {
      const templateWithMissingVars = `# {{title}}

Unknown variable: {{unknown_var}}
Known variable: {{type}}

Content: {{content}}`;

      await context.noteTypeManager.createNoteType(
        'incomplete',
        'Template with missing variables',
        templateWithMissingVars
      );

      const noteInfo = await context.noteManager.createNote(
        'incomplete',
        'Test Missing Vars',
        'Testing missing variables.',
        true
      );

      const noteContent = await fs.readFile(noteInfo.path, 'utf-8');

      assert(noteContent.includes('# Test Missing Vars'), 'Title should be substituted');
      assert(
        noteContent.includes('Known variable: incomplete'),
        'Known vars should work'
      );
      assert(
        noteContent.includes('Unknown variable: {{unknown_var}}'),
        'Unknown vars should remain unchanged'
      );
    });
  });

  describe('Template Variables', () => {
    test('should substitute all standard variables correctly', async () => {
      const noteInfo = await context.noteManager.createNote(
        'general',
        'Variable Test',
        'Testing all variables.',
        true
      );

      const noteContent = await fs.readFile(noteInfo.path, 'utf-8');

      // Check that no template variables remain
      assert(!noteContent.includes('{{title}}'), 'Title variable should be replaced');
      assert(!noteContent.includes('{{type}}'), 'Type variable should be replaced');
      assert(!noteContent.includes('{{date}}'), 'Date variable should be replaced');
      assert(!noteContent.includes('{{time}}'), 'Time variable should be replaced');
      assert(!noteContent.includes('{{content}}'), 'Content variable should be replaced');
    });

    test('should handle content variable placement correctly', async () => {
      const customTemplate = `# {{title}}

Before content.

{{content}}

After content.`;

      await context.noteTypeManager.createNoteType(
        'content-test',
        'Testing content placement',
        customTemplate
      );

      const noteInfo = await context.noteManager.createNote(
        'content-test',
        'Content Placement Test',
        'This is the main content.',
        true
      );

      const noteContent = await fs.readFile(noteInfo.path, 'utf-8');

      assert(
        noteContent.includes(
          'Before content.\n\nThis is the main content.\n\nAfter content.'
        ),
        'Content should be placed correctly in template'
      );
    });

    test('should work with empty content and template', async () => {
      const noteInfo = await context.noteManager.createNote(
        'general',
        'Empty Content Note',
        '',
        true
      );

      const noteContent = await fs.readFile(noteInfo.path, 'utf-8');

      assert(noteContent.includes('# Empty Content Note'), 'Should have title');
      assert(noteContent.includes('## Context'), 'Should have template structure');

      // Content section should be present
      const contentMatch = noteContent.match(/## Content\s*\n/);
      assert(contentMatch, 'Should have content section from template');
    });
  });
});
