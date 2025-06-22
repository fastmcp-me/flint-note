/**
 * Metadata Integration Tests
 *
 * Comprehensive tests for the metadata schema system integration
 * with note types and note creation workflows.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { MetadataSchemaParser, MetadataValidator } from '../src/core/metadata-schema.ts';
import { NoteTypeManager } from '../src/core/note-types.ts';
import { NoteManager } from '../src/core/notes.ts';
import { Workspace } from '../src/core/workspace.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Metadata Schema Integration', () => {
  let testDir: string;
  let workspace: Workspace;
  let noteTypeManager: NoteTypeManager;
  let noteManager: NoteManager;

  // Setup before each test
  async function setupTest() {
    testDir = path.join(
      __dirname,
      `temp-metadata-integration-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await fs.mkdir(testDir, { recursive: true });

    workspace = new Workspace(testDir);
    await workspace.initialize();

    noteTypeManager = new NoteTypeManager(workspace);
    noteManager = new NoteManager(workspace, noteTypeManager);
  }

  // Cleanup after each test
  async function cleanupTest() {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  describe('Note Type with Metadata Schema', () => {
    test('should create note type with structured metadata schema', async () => {
      await setupTest();

      const schema = {
        fields: [
          {
            name: 'author',
            type: 'string',
            required: true,
            description: 'Book author'
          },
          {
            name: 'rating',
            type: 'number',
            required: true,
            description: 'Personal rating',
            constraints: { min: 1, max: 5 }
          },
          {
            name: 'genre',
            type: 'select',
            required: false,
            description: 'Book genre',
            constraints: { options: ['fiction', 'non-fiction', 'biography'] }
          }
        ]
      };

      await noteTypeManager.createNoteType(
        'book-reviews',
        'Track books I have read',
        null,
        ['Always ask about the author', 'Extract key insights'],
        schema
      );

      const noteType = await noteTypeManager.getNoteTypeDescription('book-reviews');
      assert.strictEqual(noteType.metadataSchema.fields.length, 3);

      const authorField = noteType.metadataSchema.fields.find(f => f.name === 'author');
      assert.ok(authorField);
      assert.strictEqual(authorField.name, 'author');
      assert.strictEqual(authorField.type, 'string');
      assert.strictEqual(authorField.required, true);
      assert.strictEqual(authorField.description, 'Book author');

      await cleanupTest();
    });

    test('should validate metadata when creating notes', async () => {
      await setupTest();

      // Create note type with schema
      const schema = {
        fields: [
          {
            name: 'author',
            type: 'string',
            required: true,
            description: 'Book author'
          },
          {
            name: 'rating',
            type: 'number',
            required: true,
            constraints: { min: 1, max: 5 }
          }
        ]
      };

      await noteTypeManager.createNoteType(
        'book-reviews',
        'Track books I have read',
        null,
        null,
        schema
      );

      // Valid metadata should work
      const validMetadata = {
        author: 'James Clear',
        rating: 5
      };

      const noteInfo = await noteManager.createNote(
        'book-reviews',
        'Atomic Habits',
        'Great book about habits.',
        false,
        validMetadata
      );

      assert.strictEqual(noteInfo.title, 'Atomic Habits');

      // Invalid metadata should fail
      const invalidMetadata = {
        // missing required 'author' field
        rating: 10 // exceeds max
      };

      try {
        await noteManager.createNote(
          'book-reviews',
          'Invalid Book',
          'This should fail.',
          false,
          invalidMetadata
        );
        assert.fail('Expected validation to fail');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Metadata validation failed'));
      }

      await cleanupTest();
    });

    test('should include metadata in note content', async () => {
      await setupTest();

      await noteTypeManager.createNoteType('book-reviews', 'Track books I have read');

      const metadata = {
        author: 'Cal Newport',
        genre: 'productivity',
        rating: 4
      };

      const noteInfo = await noteManager.createNote(
        'book-reviews',
        'Deep Work',
        'Excellent book on focused work.',
        false,
        metadata
      );

      const note = await noteManager.getNote(noteInfo.id);

      assert.ok(note.rawContent.includes('author: "Cal Newport"'));
      assert.ok(note.rawContent.includes('genre: "productivity"'));
      assert.ok(note.rawContent.includes('rating: 4'));
      assert.strictEqual(note.metadata.author, 'Cal Newport');
      assert.strictEqual(note.metadata.rating, 4);

      await cleanupTest();
    });

    test('should handle complex metadata types', async () => {
      await setupTest();

      const schema = {
        fields: [
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Project title'
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            description: 'Project status',
            constraints: { options: ['planning', 'active', 'completed'] }
          },
          {
            name: 'priority',
            type: 'number',
            required: true,
            description: 'Priority level',
            constraints: { min: 1, max: 5 }
          },
          {
            name: 'deadline',
            type: 'date',
            required: false,
            description: 'Project deadline'
          },
          {
            name: 'team_members',
            type: 'array',
            required: false,
            description: 'Team members'
          },
          {
            name: 'completed',
            type: 'boolean',
            required: false,
            description: 'Is completed'
          }
        ]
      };

      await noteTypeManager.createNoteType(
        'projects',
        'Project tracking',
        null,
        null,
        schema
      );

      const metadata = {
        title: 'Website Redesign',
        status: 'active',
        priority: 3,
        deadline: '2024-12-31T23:59:59Z',
        team_members: ['Alice', 'Bob', 'Carol'],
        completed: false
      };

      const noteInfo = await noteManager.createNote(
        'projects',
        'Website Redesign Project',
        'Redesigning our company website.',
        false,
        metadata
      );

      const note = await noteManager.getNote(noteInfo.id);

      // Verify all metadata types are correctly stored
      assert.strictEqual(note.metadata.status, 'active');
      assert.strictEqual(note.metadata.priority, 3);
      assert.strictEqual(note.metadata.deadline, '2024-12-31T23:59:59Z');
      assert.deepStrictEqual(note.metadata.team_members, ['Alice', 'Bob', 'Carol']);
      assert.strictEqual(note.metadata.completed, false);

      await cleanupTest();
    });

    test('should validate against pattern constraints', async () => {
      await setupTest();

      const schema = {
        fields: [
          {
            name: 'email',
            type: 'string',
            required: true,
            description: 'Contact email',
            constraints: { pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' }
          },
          {
            name: 'phone',
            type: 'string',
            required: false,
            description: 'Phone number',
            constraints: { pattern: '^\\+?[1-9]\\d{1,14}$' }
          }
        ]
      };

      await noteTypeManager.createNoteType(
        'contacts',
        'Contact information',
        null,
        null,
        schema
      );

      // Valid email should work
      const validMetadata = {
        email: 'john.doe@example.com',
        phone: '+1234567890'
      };

      const noteInfo = await noteManager.createNote(
        'contacts',
        'John Doe',
        'Contact information for John.',
        false,
        validMetadata
      );

      assert.strictEqual(noteInfo.title, 'John Doe');

      // Invalid email should fail
      const invalidMetadata = {
        email: 'invalid-email-format',
        phone: 'abc123'
      };

      try {
        await noteManager.createNote(
          'contacts',
          'Invalid Contact',
          'This should fail.',
          false,
          invalidMetadata
        );
        assert.fail('Expected validation to fail');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Metadata validation failed'));
        assert.ok(error.message.includes('does not match required pattern'));
      }

      await cleanupTest();
    });

    test('should handle array constraints', async () => {
      await setupTest();

      const schema = {
        fields: [
          {
            name: 'tags',
            type: 'array',
            required: true,
            description: 'Article tags',
            constraints: { min: 1, max: 5 }
          },
          {
            name: 'categories',
            type: 'array',
            required: false,
            description: 'Article categories',
            constraints: { max: 3 }
          }
        ]
      };

      await noteTypeManager.createNoteType(
        'articles',
        'Article notes',
        null,
        null,
        schema
      );

      // Valid arrays should work
      const validMetadata = {
        tags: ['javascript', 'web-development'],
        categories: ['tech', 'programming']
      };

      const noteInfo = await noteManager.createNote(
        'articles',
        'JavaScript Best Practices',
        'Article about JS best practices.',
        false,
        validMetadata
      );

      assert.strictEqual(noteInfo.title, 'JavaScript Best Practices');

      // Array too long should fail
      const invalidMetadata = {
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'], // exceeds max of 5
        categories: ['cat1', 'cat2', 'cat3', 'cat4'] // exceeds max of 3
      };

      try {
        await noteManager.createNote(
          'articles',
          'Invalid Article',
          'This should fail.',
          false,
          invalidMetadata
        );
        assert.fail('Expected validation to fail');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Metadata validation failed'));
        assert.ok(error.message.includes('must have at most'));
      }

      await cleanupTest();
    });

    test('should generate schema documentation correctly', async () => {
      await setupTest();

      const schema = {
        fields: [
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Recipe title'
          },
          {
            name: 'difficulty',
            type: 'number',
            required: true,
            description: 'Difficulty level',
            constraints: { min: 1, max: 10 }
          },
          {
            name: 'cuisine',
            type: 'select',
            required: false,
            description: 'Cuisine type',
            constraints: { options: ['italian', 'asian', 'mexican'] }
          }
        ]
      };

      await noteTypeManager.createNoteType(
        'recipes',
        'Recipe collection',
        null,
        null,
        schema
      );

      const noteType = await noteTypeManager.getNoteTypeDescription('recipes');
      const description = noteType.description;

      assert.ok(description.includes('## Metadata Schema'));
      assert.ok(description.includes('- title: Recipe title (required)'));
      assert.ok(
        description.includes(
          '- difficulty: Difficulty level (required, number, min: 1, max: 10)'
        )
      );
      assert.ok(
        description.includes(
          '- cuisine: Cuisine type (optional, select, options: ["italian", "asian", "mexican"])'
        )
      );

      await cleanupTest();
    });

    test('should update metadata schema for existing note type', async () => {
      await setupTest();

      // Create initial note type
      await noteTypeManager.createNoteType('projects', 'Track project information');

      // Update with new schema
      const newSchema = {
        fields: [
          {
            name: 'status',
            type: 'select',
            required: true,
            constraints: { options: ['planning', 'active', 'completed'] }
          },
          {
            name: 'priority',
            type: 'number',
            required: false,
            constraints: { min: 1, max: 3 }
          }
        ]
      };

      await noteTypeManager.updateMetadataSchema('projects', newSchema);

      const updatedType = await noteTypeManager.getNoteTypeDescription('projects');
      assert.strictEqual(updatedType.metadataSchema.fields.length, 2);

      const statusField = updatedType.metadataSchema.fields.find(
        f => f.name === 'status'
      );
      assert.ok(statusField);
      assert.deepStrictEqual(statusField.constraints?.options, [
        'planning',
        'active',
        'completed'
      ]);

      await cleanupTest();
    });

    test('should handle note creation with template and metadata', async () => {
      await setupTest();

      const template = `# {{title}}

**Author:** {{author}}
**Rating:** {{rating}}/5
**Genre:** {{genre}}

## Summary
{{summary}}

## Notes
{{content}}`;

      const schema = {
        fields: [
          {
            name: 'author',
            type: 'string',
            required: true,
            description: 'Book author'
          },
          {
            name: 'rating',
            type: 'number',
            required: true,
            constraints: { min: 1, max: 5 }
          },
          {
            name: 'genre',
            type: 'string',
            required: false,
            description: 'Book genre'
          },
          {
            name: 'summary',
            type: 'string',
            required: false,
            description: 'Book summary'
          }
        ]
      };

      await noteTypeManager.createNoteType(
        'book-reviews',
        'Book review notes',
        template,
        null,
        schema
      );

      const metadata = {
        author: 'Ryan Holiday',
        rating: 4,
        genre: 'Philosophy',
        summary: 'A book about Stoic philosophy and resilience.'
      };

      const noteInfo = await noteManager.createNote(
        'book-reviews',
        'The Obstacle Is the Way',
        'Excellent introduction to Stoicism.',
        true, // use template
        metadata
      );

      const note = await noteManager.getNote(noteInfo.id);

      // Verify template was used with metadata substitution
      assert.ok(note.content.includes('**Author:** Ryan Holiday'));
      assert.ok(note.content.includes('**Rating:** 4/5'));
      assert.ok(note.content.includes('**Genre:** Philosophy'));
      assert.ok(note.content.includes('A book about Stoic philosophy and resilience.'));
      assert.ok(note.content.includes('Excellent introduction to Stoicism.'));

      await cleanupTest();
    });

    test('should handle metadata validation warnings for unknown fields', async () => {
      await setupTest();

      const schema = {
        fields: [
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Note title'
          }
        ]
      };

      await noteTypeManager.createNoteType(
        'simple-notes',
        'Simple note type',
        null,
        null,
        schema
      );

      // Include unknown field - should still work but generate warning
      const metadata = {
        title: 'Test Note',
        unknown_field: 'some value'
      };

      const noteInfo = await noteManager.createNote(
        'simple-notes',
        'Test Note',
        'Test content.',
        false,
        metadata
      );

      // Should succeed despite unknown field
      assert.strictEqual(noteInfo.title, 'Test Note');

      const note = await noteManager.getNote(noteInfo.id);
      assert.strictEqual(note.metadata.title, 'Test Note');
      assert.strictEqual(note.metadata.unknown_field, 'some value');

      await cleanupTest();
    });
  });
});
