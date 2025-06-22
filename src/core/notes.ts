/**
 * Note Manager
 *
 * Handles CRUD operations for individual notes, including creation,
 * reading, updating, deletion, and metadata management.
 */

import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { Workspace } from './workspace.ts';
import { NoteTypeManager } from './note-types.ts';
import { SearchManager } from './search.ts';
import { MetadataValidator } from './metadata-schema.ts';
import type { ValidationResult } from './metadata-schema.ts';
import type { NoteLink } from '../types/index.ts';

interface NoteMetadata {
  title?: string;
  type?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  links?: NoteLink[];
  [key: string]: string | string[] | number | boolean | NoteLink[] | undefined;
}

interface ParsedNote {
  metadata: NoteMetadata;
  content: string;
}

interface NoteInfo {
  id: string;
  type: string;
  title: string;
  filename: string;
  path: string;
  created: string;
}

interface Note {
  id: string;
  type: string;
  filename: string;
  path: string;
  title: string;
  content: string;
  metadata: NoteMetadata;
  rawContent: string;
  created: string;
  modified: string;
  updated: string;
  size: number;
}

interface UpdateResult {
  id: string;
  updated: boolean;
  timestamp: string;
}

interface DeleteResult {
  id: string;
  deleted: boolean;
  timestamp: string;
}

interface NoteListItem {
  id: string;
  type: string;
  filename: string;
  title: string;
  created: string;
  modified: string;
  size: number;
  tags: string[];
}

interface ParsedIdentifier {
  typeName: string;
  filename: string;
  notePath: string;
}

export class NoteManager {
  #workspace: Workspace;
  #noteTypeManager: NoteTypeManager;

  constructor(workspace: Workspace) {
    this.#workspace = workspace;
    this.#noteTypeManager = new NoteTypeManager(workspace);
  }

  /**
   * Create a new note of the specified type
   */
  async createNote(
    typeName: string,
    title: string,
    content: string,
    useTemplate: boolean = false,
    metadata: Record<string, unknown> = {}
  ): Promise<NoteInfo> {
    try {
      // Validate inputs
      if (!title || title.trim().length === 0) {
        throw new Error('Note title is required and cannot be empty');
      }

      // Trim the title for consistent handling
      const trimmedTitle = title.trim();

      // Validate and ensure note type exists
      if (!this.#workspace.isValidNoteTypeName(typeName)) {
        throw new Error(`Invalid note type name: ${typeName}`);
      }

      const typePath = await this.#workspace.ensureNoteType(typeName);

      // Generate unique filename from title
      const baseFilename = this.generateFilename(trimmedTitle);
      const filename = await this.generateUniqueFilename(typePath, baseFilename);
      const notePath = path.join(typePath, filename);

      // Prepare metadata with title for validation
      const metadataWithTitle = {
        title: trimmedTitle,
        ...metadata
      };

      // Validate metadata against schema
      const validationResult = await this.validateMetadata(typeName, metadataWithTitle);
      if (!validationResult.valid) {
        throw new Error(
          `Metadata validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        );
      }

      // Prepare note content with metadata and optional template
      const noteContent = await this.formatNoteContent(
        trimmedTitle,
        content,
        typeName,
        useTemplate,
        metadata
      );

      // Write the note file
      await fs.writeFile(notePath, noteContent, 'utf-8');

      // Update search index
      await this.updateSearchIndex(notePath, noteContent);

      return {
        id: this.generateNoteId(typeName, filename),
        type: typeName,
        title: trimmedTitle,
        filename,
        path: notePath,
        created: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create note '${title}': ${errorMessage}`);
    }
  }

  /**
   * Generate a filesystem-safe filename from a title
   */
  generateFilename(title: string): string {
    // Remove or replace problematic characters
    let filename = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Ensure filename isn't empty
    if (!filename) {
      filename = 'untitled';
    }

    // Ensure it doesn't exceed filesystem limits (considering full path length)
    if (filename.length > 100) {
      filename = filename.substring(0, 100);
    }

    return `${filename}.md`;
  }

  /**
   * Generate a unique filename by appending numbers if file already exists
   */
  async generateUniqueFilename(typePath: string, baseFilename: string): Promise<string> {
    let filename = baseFilename;
    let counter = 1;

    while (true) {
      const filePath = path.join(typePath, filename);
      try {
        await fs.access(filePath);
        // File exists, try next number
        const nameWithoutExt = baseFilename.replace(/\.md$/, '');
        filename = `${nameWithoutExt}-${counter}.md`;
        counter++;
      } catch (error) {
        // File doesn't exist, we can use this filename
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          return filename;
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Generate a unique note ID
   */
  generateNoteId(typeName: string, filename: string): string {
    return `${typeName}/${filename}`;
  }

  /**
   * Format note content with metadata frontmatter and optional template
   */
  async formatNoteContent(
    title: string,
    content: string,
    typeName: string,
    useTemplate: boolean = false,
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    const timestamp = new Date().toISOString();

    let formattedContent = '---\n';
    formattedContent += `title: "${title}"\n`;
    formattedContent += `type: ${typeName}\n`;
    formattedContent += `created: ${timestamp}\n`;
    formattedContent += `updated: ${timestamp}\n`;

    // Add custom metadata fields
    for (const [key, value] of Object.entries(metadata)) {
      if (key !== 'title' && key !== 'type' && key !== 'created' && key !== 'updated') {
        if (Array.isArray(value)) {
          formattedContent += `${key}: [${value.map(v => (typeof v === 'string' ? `"${v}"` : v)).join(', ')}]\n`;
        } else if (typeof value === 'string') {
          formattedContent += `${key}: "${value}"\n`;
        } else {
          formattedContent += `${key}: ${value}\n`;
        }
      }
    }

    // Add default tags if not specified
    if (!metadata.tags) {
      formattedContent += 'tags: []\n';
    }

    formattedContent += '---\n\n';

    if (useTemplate) {
      try {
        const template = await this.#noteTypeManager.getNoteTypeTemplate(typeName);
        const hasContentPlaceholder = template.includes('{{content}}');

        const templateVars = {
          title,
          type: typeName,
          created: timestamp,
          updated: timestamp,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          content: hasContentPlaceholder ? content : '',
          ...metadata
        };

        const processedTemplate = this.processTemplate(template, templateVars);

        // If template doesn't include title header, add it
        if (!processedTemplate.includes(`# ${title}`)) {
          formattedContent += `# ${title}\n\n`;
        }

        formattedContent += processedTemplate;

        // Add user content if provided and template doesn't have content placeholder
        if (content && !hasContentPlaceholder) {
          formattedContent += `\n\n${content}`;
        }
      } catch {
        // Fall back to default format if template fails
        formattedContent += `# ${title}\n\n`;
        formattedContent += content;
      }
    } else {
      formattedContent += `# ${title}\n\n`;
      formattedContent += content;
    }

    return formattedContent;
  }

  /**
   * Process template variables with substitutions
   */
  private processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template;

    // Replace template variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value);
    }

    return processed;
  }

  /**
   * Get a specific note by identifier
   */
  async getNote(identifier: string): Promise<Note | null> {
    try {
      const { typeName, filename, notePath } = this.parseNoteIdentifier(identifier);

      // Check if note exists
      try {
        await fs.access(notePath);
      } catch {
        return null;
      }

      // Read note content
      const content = await fs.readFile(notePath, 'utf-8');
      const stats = await fs.stat(notePath);

      // Parse frontmatter and content
      const parsed = this.parseNoteContent(content);

      return {
        id: identifier,
        type: typeName,
        filename,
        path: notePath,
        title: parsed.metadata.title || this.extractTitleFromFilename(filename),
        content: parsed.content,
        metadata: parsed.metadata,
        rawContent: content,
        created: parsed.metadata.created || stats.birthtime.toISOString(),
        modified: parsed.metadata.updated || stats.mtime.toISOString(),
        updated: parsed.metadata.updated || stats.mtime.toISOString(),
        size: stats.size
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get note '${identifier}': ${errorMessage}`);
    }
  }

  /**
   * Get a specific note by file path
   */
  async getNoteByPath(notePath: string): Promise<Note | null> {
    try {
      // Validate path is in workspace
      if (!this.#workspace.isPathInWorkspace(notePath)) {
        throw new Error('Path is outside workspace');
      }

      // Check if note exists
      try {
        await fs.access(notePath);
      } catch {
        return null;
      }

      // Extract type and filename from path
      const relativePath = path.relative(this.#workspace.rootPath, notePath);
      const pathParts = relativePath.split(path.sep);
      const typeName = pathParts[0];
      const filename = pathParts.slice(1).join(path.sep);
      const identifier = `${typeName}/${filename}`;

      // Read note content
      const content = await fs.readFile(notePath, 'utf-8');
      const stats = await fs.stat(notePath);

      // Parse frontmatter and content
      const parsed = this.parseNoteContent(content);

      return {
        id: identifier,
        type: typeName,
        filename,
        path: notePath,
        title: parsed.metadata.title || this.extractTitleFromFilename(filename),
        content: parsed.content,
        metadata: parsed.metadata,
        rawContent: content,
        created: parsed.metadata.created || stats.birthtime.toISOString(),
        modified: parsed.metadata.updated || stats.mtime.toISOString(),
        updated: parsed.metadata.updated || stats.mtime.toISOString(),
        size: stats.size
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get note by path '${notePath}': ${errorMessage}`);
    }
  }

  /**
   * Parse note identifier to extract type, filename, and path
   */
  parseNoteIdentifier(identifier: string): ParsedIdentifier {
    let typeName: string;
    let filename: string;

    if (identifier.includes('/')) {
      // Format: "type/filename"
      const parts = identifier.split('/');
      typeName = parts[0];
      filename = parts.slice(1).join('/');
    } else {
      // Just filename, assume default type
      const config = this.#workspace.getConfig();
      typeName = config?.default_note_type || 'general';
      filename = identifier;
    }

    // Ensure filename has .md extension
    if (!filename.endsWith('.md')) {
      filename += '.md';
    }

    const notePath = this.#workspace.getNotePath(typeName, filename);

    return { typeName, filename, notePath };
  }

  /**
   * Parse note content to separate frontmatter and body
   */
  parseNoteContent(content: string): ParsedNote {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match) {
      const frontmatter = match[1];
      const body = match[2];

      // Parse YAML frontmatter
      const metadata = this.parseFrontmatter(frontmatter);

      return {
        metadata,
        content: body.trim()
      };
    } else {
      // No frontmatter, entire content is body
      return {
        metadata: {},
        content: content.trim()
      };
    }
  }

  /**
   * Parse YAML frontmatter
   */
  parseFrontmatter(frontmatter: string): NoteMetadata {
    try {
      const parsed = yaml.load(frontmatter) as Record<string, unknown>;

      if (!parsed || typeof parsed !== 'object') {
        return {};
      }

      // Convert to NoteMetadata format
      const metadata: NoteMetadata = {};

      for (const [key, value] of Object.entries(parsed)) {
        if (key === 'links' && Array.isArray(value)) {
          // Parse links array with proper typing
          metadata.links = value.map(
            (link: Record<string, unknown>) =>
              ({
                target: (link.target as string) || '',
                relationship: (link.relationship as string) || 'references',
                created: (link.created as string) || new Date().toISOString(),
                context: link.context as string | undefined
              }) as NoteLink
          );
        } else {
          // Type guard for allowed metadata values
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            Array.isArray(value) ||
            value === undefined
          ) {
            metadata[key] = value;
          }
        }
      }

      return metadata;
    } catch (error) {
      console.error('Failed to parse YAML frontmatter:', error);
      return {};
    }
  }

  /**
   * Extract title from filename
   */
  extractTitleFromFilename(filename: string): string {
    return filename
      .replace(/\.md$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  /**
   * Update an existing note
   */
  async updateNote(identifier: string, newContent: string): Promise<UpdateResult> {
    try {
      const {
        typeName: _typeName,
        filename: _filename,
        notePath
      } = this.parseNoteIdentifier(identifier);

      // Check if note exists
      try {
        await fs.access(notePath);
      } catch {
        throw new Error(`Note '${identifier}' does not exist`);
      }

      // Read current content to preserve metadata
      const currentContent = await fs.readFile(notePath, 'utf-8');
      const parsed = this.parseNoteContent(currentContent);

      // Update the content while preserving metadata
      const updatedMetadata = {
        ...parsed.metadata,
        updated: new Date().toISOString()
      };

      const updatedContent = this.formatUpdatedNoteContent(updatedMetadata, newContent);

      // Write updated content
      await fs.writeFile(notePath, updatedContent, 'utf-8');

      // Update search index
      await this.updateSearchIndex(notePath, updatedContent);

      return {
        id: identifier,
        updated: true,
        timestamp: updatedMetadata.updated
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update note '${identifier}': ${errorMessage}`);
    }
  }

  /**
   * Format updated note content with preserved metadata
   */
  formatUpdatedNoteContent(metadata: NoteMetadata, newContent: string): string {
    let formattedContent = '---\n';

    for (const [key, value] of Object.entries(metadata)) {
      if (key === 'links' && Array.isArray(value)) {
        // Special handling for links array
        if (value.length > 0) {
          formattedContent += 'links:\n';
          (value as NoteLink[]).forEach((link: NoteLink) => {
            formattedContent += `  - target: "${link.target}"\n`;
            formattedContent += `    relationship: "${link.relationship}"\n`;
            formattedContent += `    created: "${link.created}"\n`;
            if (link.context) {
              formattedContent += `    context: "${link.context}"\n`;
            }
          });
        }
      } else if (Array.isArray(value)) {
        // Handle other arrays (like tags)
        if (value.length > 0) {
          formattedContent += `${key}: [${value.map(v => `"${v}"`).join(', ')}]\n`;
        } else {
          formattedContent += `${key}: []\n`;
        }
      } else if (typeof value === 'string' && value.includes(' ')) {
        formattedContent += `${key}: "${value}"\n`;
      } else {
        formattedContent += `${key}: ${value}\n`;
      }
    }

    formattedContent += '---\n\n';
    formattedContent += newContent;

    return formattedContent;
  }

  /**
   * Update a note with custom metadata, avoiding duplicate frontmatter
   */
  async updateNoteWithMetadata(
    identifier: string,
    content: string,
    metadata: NoteMetadata
  ): Promise<UpdateResult> {
    try {
      const {
        typeName: _typeName,
        filename: _filename,
        notePath
      } = this.parseNoteIdentifier(identifier);

      // Check if note exists
      try {
        await fs.access(notePath);
      } catch {
        throw new Error(`Note '${identifier}' does not exist`);
      }

      // Add timestamp to metadata
      const updatedMetadata = {
        ...metadata,
        updated: new Date().toISOString()
      };

      // Format content with metadata
      const formattedContent = this.formatUpdatedNoteContent(updatedMetadata, content);

      // Write updated content
      await fs.writeFile(notePath, formattedContent, 'utf-8');

      // Update search index
      await this.updateSearchIndex(notePath, formattedContent);

      return {
        id: identifier,
        updated: true,
        timestamp: updatedMetadata.updated
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update note '${identifier}': ${errorMessage}`);
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(identifier: string): Promise<DeleteResult> {
    try {
      const {
        typeName: _typeName,
        filename: _filename,
        notePath
      } = this.parseNoteIdentifier(identifier);

      // Check if note exists
      try {
        await fs.access(notePath);
      } catch {
        throw new Error(`Note '${identifier}' does not exist`);
      }

      // Remove from search index first
      await this.removeFromSearchIndex(notePath);

      // Delete the file
      await fs.unlink(notePath);

      return {
        id: identifier,
        deleted: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete note '${identifier}': ${errorMessage}`);
    }
  }

  /**
   * List notes in a specific type
   */
  async listNotes(typeName?: string, limit?: number): Promise<NoteListItem[]> {
    try {
      const notes: NoteListItem[] = [];
      let noteTypes: Array<{ name: string; path: string }> = [];

      if (typeName) {
        // List notes from specific type
        const typePath = this.#workspace.getNoteTypePath(typeName);
        try {
          await fs.access(typePath);
          noteTypes = [{ name: typeName, path: typePath }];
        } catch {
          throw new Error(`Note type '${typeName}' does not exist`);
        }
      } else {
        // List notes from all types
        const workspaceRoot = this.#workspace.rootPath;
        const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });

        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules'
          ) {
            noteTypes.push({
              name: entry.name,
              path: path.join(workspaceRoot, entry.name)
            });
          }
        }
      }

      // Collect notes from each type
      for (const noteType of noteTypes) {
        try {
          const typeEntries = await fs.readdir(noteType.path);
          const noteFiles = typeEntries.filter(
            file => file.endsWith('.md') && !file.startsWith('.')
          );

          for (const filename of noteFiles) {
            const notePath = path.join(noteType.path, filename);
            const stats = await fs.stat(notePath);

            // Read just the frontmatter for efficiency
            const content = await fs.readFile(notePath, 'utf-8');
            const parsed = this.parseNoteContent(content);

            notes.push({
              id: this.generateNoteId(noteType.name, filename),
              type: noteType.name,
              filename,
              title: parsed.metadata.title || this.extractTitleFromFilename(filename),
              created: stats.birthtime.toISOString(),
              modified: stats.mtime.toISOString(),
              size: stats.size,
              tags: parsed.metadata.tags || []
            });
          }
        } catch {
          // Continue with other types if one fails
          continue;
        }
      }

      // Sort by modification date (newest first)
      notes.sort(
        (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
      );

      // Apply limit if specified
      if (limit && limit > 0) {
        return notes.slice(0, limit);
      }

      return notes;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list notes: ${errorMessage}`);
    }
  }

  /**
   * Update search index for a note
   */
  async updateSearchIndex(notePath: string, content: string): Promise<void> {
    try {
      const searchManager = new SearchManager(this.#workspace);
      await searchManager.updateNoteInIndex(notePath, content);
    } catch (error) {
      // Don't fail note operations if search index update fails
      console.error(
        'Failed to update search index:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Remove note from search index
   */
  async removeFromSearchIndex(notePath: string): Promise<void> {
    try {
      const searchManager = new SearchManager(this.#workspace);
      await searchManager.removeNoteFromIndex(notePath);
    } catch (error) {
      // Don't fail note operations if search index update fails
      console.error(
        'Failed to remove from search index:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Validate metadata against note type schema
   */
  async validateMetadata(
    typeName: string,
    metadata: Record<string, unknown>
  ): Promise<ValidationResult> {
    try {
      const schema = await this.#noteTypeManager.getMetadataSchema(typeName);
      return MetadataValidator.validate(metadata, schema);
    } catch (error) {
      // If schema retrieval fails, allow the operation but log warning
      console.warn(
        `Failed to get metadata schema for type '${typeName}':`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return { valid: true, errors: [], warnings: [] };
    }
  }
}
