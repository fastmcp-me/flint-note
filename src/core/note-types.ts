/**
 * Note Type Manager
 *
 * Handles operations related to note types, including creation, management,
 * and metadata operations for different categories of notes.
 */

import path from 'path';
import fs from 'fs/promises';
import { Workspace } from './workspace.ts';
import { MetadataSchemaParser } from './metadata-schema.ts';
import type { MetadataSchema } from './metadata-schema.ts';

interface NoteTypeInfo {
  name: string;
  path: string;
  created: string;
}

interface ParsedNoteTypeDescription {
  purpose: string;
  agentInstructions: string[];
  metadataSchema: string[];
  parsedMetadataSchema: MetadataSchema;
}

interface NoteTypeDescription {
  name: string;
  path: string;
  description: string;
  parsed: ParsedNoteTypeDescription;
  metadataSchema: MetadataSchema;
}

interface NoteTypeListItem {
  name: string;
  path: string;
  purpose: string;
  agentInstructions: string[];
  hasDescription: boolean;
  noteCount: number;
  lastModified: string;
}

interface NoteTypeUpdateRequest {
  description?: string;
}

interface DeleteResult {
  name: string;
  deleted: boolean;
  timestamp: string;
}

export class NoteTypeManager {
  private workspace: Workspace;

  constructor(workspace: Workspace) {
    this.workspace = workspace;
  }

  /**
   * Create a new note type with description
   */
  async createNoteType(
    name: string,
    description: string,
    agentInstructions: string[] | null = null,
    metadataSchema: MetadataSchema | null = null
  ): Promise<NoteTypeInfo> {
    try {
      // Validate note type name
      if (!this.workspace.isValidNoteTypeName(name)) {
        throw new Error(`Invalid note type name: ${name}`);
      }

      // Ensure the note type directory exists
      const typePath = await this.workspace.ensureNoteType(name);

      // Create the description file in the .jade-note config directory
      const descriptionPath = path.join(
        this.workspace.jadeNoteDir,
        `${name}_description.md`
      );
      const descriptionContent = this.formatNoteTypeDescription(
        name,
        description,
        agentInstructions,
        metadataSchema
      );
      await fs.writeFile(descriptionPath, descriptionContent, 'utf-8');

      return {
        name,
        path: typePath,
        created: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create note type '${name}': ${errorMessage}`);
    }
  }

  /**
   * Format note type description in the standard format
   */
  formatNoteTypeDescription(
    name: string,
    description: string,
    agentInstructions: string[] | null = null,
    metadataSchema: MetadataSchema | null = null
  ): string {
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    let content = `# ${formattedName}\n\n`;
    content += `## Purpose\n${description}\n\n`;
    content += '## Agent Instructions\n';

    if (agentInstructions && agentInstructions.length > 0) {
      // Use custom agent instructions, filtering out empty strings
      const validInstructions = agentInstructions.filter(
        instruction => instruction && instruction.trim().length > 0
      );

      if (validInstructions.length > 0) {
        for (const instruction of validInstructions) {
          content += `- ${instruction}\n`;
        }
      } else {
        // All instructions were empty, use defaults
        content +=
          '- Ask clarifying questions to understand the context and purpose of this note\n';
        content +=
          '- Suggest relevant tags and connections to existing notes in the knowledge base\n';
        content += '- Help organize content with clear headings and logical structure\n';
        content +=
          '- Identify and extract actionable items, deadlines, or follow-up tasks\n';
        content +=
          '- Recommend when this note might benefit from linking to other note types\n';
        content +=
          '- Offer to enhance content with additional context, examples, or details\n';
        content += '- Suggest follow-up questions or areas that could be expanded upon\n';
        content += '- Help maintain consistency with similar notes of this type\n';
      }
    } else {
      // Use default agent instructions
      content +=
        '- Ask clarifying questions to understand the context and purpose of this note\n';
      content +=
        '- Suggest relevant tags and connections to existing notes in the knowledge base\n';
      content += '- Help organize content with clear headings and logical structure\n';
      content +=
        '- Identify and extract actionable items, deadlines, or follow-up tasks\n';
      content +=
        '- Recommend when this note might benefit from linking to other note types\n';
      content +=
        '- Offer to enhance content with additional context, examples, or details\n';
      content += '- Suggest follow-up questions or areas that could be expanded upon\n';
      content += '- Help maintain consistency with similar notes of this type\n';
    }
    content += '\n';

    if (metadataSchema && metadataSchema.fields.length > 0) {
      content += MetadataSchemaParser.generateSchemaSection(metadataSchema);
    } else {
      content += '## Metadata Schema\n';
      content += 'Expected frontmatter or metadata fields for this note type:\n';
      content += `- type: ${name}\n`;
      content += '- created: Creation timestamp\n';
      content += '- updated: Last modification timestamp\n';
      content += '- tags: Relevant tags for categorization\n';
    }

    return content;
  }

  /**
   * Get note type description and metadata
   */
  async getNoteTypeDescription(typeName: string): Promise<NoteTypeDescription> {
    try {
      const typePath = this.workspace.getNoteTypePath(typeName);
      const descriptionPath = path.join(
        this.workspace.jadeNoteDir,
        `${typeName}_description.md`
      );

      // Check if note type exists
      try {
        await fs.access(typePath);
      } catch {
        throw new Error(`Note type '${typeName}' does not exist`);
      }

      // Read description file
      let description = '';
      try {
        description = await fs.readFile(descriptionPath, 'utf-8');
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          description = this.workspace.getDefaultNoteTypeDescription(typeName);
        } else {
          throw error;
        }
      }

      const parsed = this.parseNoteTypeDescription(description);
      const metadataSchema = parsed.parsedMetadataSchema;

      return {
        name: typeName,
        path: typePath,
        description,
        parsed,
        metadataSchema
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to get note type description for '${typeName}': ${errorMessage}`
      );
    }
  }

  /**
   * Parse note type description to extract structured information
   */
  parseNoteTypeDescription(content: string): ParsedNoteTypeDescription {
    const sections: ParsedNoteTypeDescription = {
      purpose: '',
      agentInstructions: [],
      metadataSchema: [],
      parsedMetadataSchema: MetadataSchemaParser.parseFromDescription(content)
    };

    const lines = content.split('\n');
    let currentSection: string | null = null;
    let sectionContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('## Purpose')) {
        if (currentSection) {
          this.addSectionContent(sections, currentSection, sectionContent);
        }
        currentSection = 'purpose';
        sectionContent = [];
      } else if (trimmed.startsWith('## Agent Instructions')) {
        if (currentSection) {
          this.addSectionContent(sections, currentSection, sectionContent);
        }
        currentSection = 'agentInstructions';
        sectionContent = [];
      } else if (trimmed.startsWith('## Metadata Schema')) {
        if (currentSection) {
          this.addSectionContent(sections, currentSection, sectionContent);
        }
        currentSection = 'metadataSchema';
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }

    // Add final section
    if (currentSection) {
      this.addSectionContent(sections, currentSection, sectionContent);
    }

    return sections;
  }

  /**
   * Helper to add section content to parsed sections
   */
  addSectionContent(
    sections: ParsedNoteTypeDescription,
    sectionName: string,
    content: string[]
  ): void {
    const text = content.join('\n').trim();

    switch (sectionName) {
      case 'purpose':
        sections.purpose = text;
        break;
      case 'agentInstructions':
        sections.agentInstructions = content
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().substring(1).trim());
        break;
      case 'metadataSchema':
        sections.metadataSchema = content.filter(line => line.trim().length > 0);
        break;
    }
  }

  /**
   * List all available note types
   */
  async listNoteTypes(): Promise<NoteTypeListItem[]> {
    try {
      const workspaceRoot = this.workspace.rootPath;
      const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });

      const noteTypes: NoteTypeListItem[] = [];

      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules'
        ) {
          const typePath = path.join(workspaceRoot, entry.name);
          const descriptionPath = path.join(
            this.workspace.jadeNoteDir,
            `${entry.name}_description.md`
          );

          // Check if this is a valid note type (has notes or description)
          const typeEntries = await fs.readdir(typePath);
          const hasNotes = typeEntries.some(
            file => file.endsWith('.md') && !file.startsWith('.') && !file.startsWith('_')
          );

          // Check if description exists in config directory
          let hasDescription = false;
          try {
            await fs.access(descriptionPath);
            hasDescription = true;
          } catch {
            hasDescription = false;
          }

          if (hasNotes || hasDescription) {
            // Get basic info about the note type
            let purpose = '';
            let noteCount = 0;

            let agentInstructions: string[] = [];

            try {
              if (hasDescription) {
                const description = await fs.readFile(descriptionPath, 'utf-8');
                const parsed = this.parseNoteTypeDescription(description);
                purpose = parsed.purpose;
                agentInstructions = parsed.agentInstructions;
              }

              noteCount = typeEntries.filter(
                file =>
                  file.endsWith('.md') && !file.startsWith('_') && !file.startsWith('.')
              ).length;
            } catch {
              // Ignore errors for individual entries
            }

            noteTypes.push({
              name: entry.name,
              path: typePath,
              purpose: purpose || `Notes of type '${entry.name}'`,
              agentInstructions,
              hasDescription,
              noteCount,
              lastModified: (await fs.stat(typePath)).mtime.toISOString()
            });
          }
        }
      }

      // Sort by name
      noteTypes.sort((a, b) => a.name.localeCompare(b.name));

      return noteTypes;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list note types: ${errorMessage}`);
    }
  }

  /**
   * Update an existing note type description
   */
  async updateNoteType(
    typeName: string,
    updates: NoteTypeUpdateRequest
  ): Promise<NoteTypeDescription> {
    try {
      const noteType = await this.getNoteTypeDescription(typeName);

      // Update description if provided
      if (updates.description) {
        const descriptionPath = path.join(
          this.workspace.jadeNoteDir,
          `${typeName}_description.md`
        );
        const newDescription = this.formatNoteTypeDescription(
          typeName,
          updates.description
        );
        await fs.writeFile(descriptionPath, newDescription, 'utf-8');
      }

      return await this.getNoteTypeDescription(typeName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update note type '${typeName}': ${errorMessage}`);
    }
  }

  /**
   * Delete a note type (only if it has no notes)
   */
  async deleteNoteType(typeName: string): Promise<DeleteResult> {
    try {
      const typePath = this.workspace.getNoteTypePath(typeName);

      // Check if note type exists
      try {
        await fs.access(typePath);
      } catch {
        throw new Error(`Note type '${typeName}' does not exist`);
      }

      // Check if there are any notes in this type
      const entries = await fs.readdir(typePath);
      const notes = entries.filter(file => file.endsWith('.md') && !file.startsWith('.'));

      if (notes.length > 0) {
        throw new Error(
          `Cannot delete note type '${typeName}': contains ${notes.length} notes`
        );
      }

      // Remove the directory and all its contents
      await fs.rm(typePath, { recursive: true, force: true });

      return {
        name: typeName,
        deleted: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete note type '${typeName}': ${errorMessage}`);
    }
  }

  /**
   * Get metadata schema for a note type
   */
  async getMetadataSchema(typeName: string): Promise<MetadataSchema> {
    try {
      const noteType = await this.getNoteTypeDescription(typeName);
      return noteType.metadataSchema;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to get metadata schema for note type '${typeName}': ${errorMessage}`
      );
    }
  }

  /**
   * Update metadata schema for a note type
   */
  async updateMetadataSchema(typeName: string, schema: MetadataSchema): Promise<void> {
    try {
      const noteType = await this.getNoteTypeDescription(typeName);

      // Generate new description with updated schema
      const newDescription = this.formatNoteTypeDescription(
        typeName,
        noteType.parsed.purpose,
        noteType.parsed.agentInstructions,
        schema
      );

      // Write updated description
      const descriptionPath = path.join(
        this.workspace.jadeNoteDir,
        `${typeName}_description.md`
      );
      await fs.writeFile(descriptionPath, newDescription, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to update metadata schema for note type '${typeName}': ${errorMessage}`
      );
    }
  }
}
