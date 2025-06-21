/**
 * Note Type Manager
 *
 * Handles operations related to note types, including creation, management,
 * and metadata operations for different categories of notes.
 */

import path from 'path';
import fs from 'fs/promises';

export class NoteTypeManager {
  constructor(workspace) {
    this.workspace = workspace;
  }

  /**
   * Create a new note type with description and optional template
   */
  async createNoteType(name, description, template = null) {
    try {
      // Validate note type name
      if (!this.workspace.isValidNoteTypeName(name)) {
        throw new Error(`Invalid note type name: ${name}`);
      }

      // Ensure the note type directory exists
      const typePath = await this.workspace.ensureNoteType(name);

      // Create the description file
      const descriptionPath = path.join(typePath, '.description.md');
      const descriptionContent = this.formatNoteTypeDescription(name, description, template);
      await fs.writeFile(descriptionPath, descriptionContent, 'utf-8');

      // Create template file if provided
      if (template) {
        const templatePath = path.join(typePath, '.template.md');
        await fs.writeFile(templatePath, template, 'utf-8');
      }

      return {
        name,
        path: typePath,
        hasTemplate: !!template,
        created: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to create note type '${name}': ${error.message}`);
    }
  }

  /**
   * Format note type description in the standard format
   */
  formatNoteTypeDescription(name, description, template = null) {
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    let content = `# ${formattedName}\n\n`;
    content += `## Purpose\n${description}\n\n`;
    content += `## Agent Instructions\n`;
    content += `- Handle notes of type '${name}' with specific behaviors\n`;
    content += `- Apply appropriate formatting and structure\n`;
    content += `- Extract relevant metadata and relationships\n`;
    content += `- Suggest improvements and connections\n\n`;

    if (template) {
      content += `## Template\n${template}\n\n`;
    }

    content += `## Metadata Schema\n`;
    content += `Expected frontmatter or metadata fields for this note type:\n`;
    content += `- type: ${name}\n`;
    content += `- created: Creation timestamp\n`;
    content += `- updated: Last modification timestamp\n`;
    content += `- tags: Relevant tags for categorization\n`;

    return content;
  }

  /**
   * Get note type description and metadata
   */
  async getNoteTypeDescription(typeName) {
    try {
      const typePath = this.workspace.getNoteTypePath(typeName);
      const descriptionPath = path.join(typePath, '.description.md');

      // Check if note type exists
      try {
        await fs.access(typePath);
      } catch (error) {
        throw new Error(`Note type '${typeName}' does not exist`);
      }

      // Read description file
      let description = '';
      try {
        description = await fs.readFile(descriptionPath, 'utf-8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          description = this.workspace.getDefaultNoteTypeDescription(typeName);
        } else {
          throw error;
        }
      }

      // Check for template file
      const templatePath = path.join(typePath, '.template.md');
      let template = null;
      try {
        template = await fs.readFile(templatePath, 'utf-8');
      } catch (error) {
        // Template is optional, ignore if not found
      }

      // Parse description content
      const parsed = this.parseNoteTypeDescription(description);

      return {
        name: typeName,
        path: typePath,
        description,
        template,
        parsed,
        hasTemplate: !!template
      };
    } catch (error) {
      throw new Error(`Failed to get note type description for '${typeName}': ${error.message}`);
    }
  }

  /**
   * Parse note type description to extract structured information
   */
  parseNoteTypeDescription(content) {
    const sections = {
      purpose: '',
      agentInstructions: [],
      template: '',
      metadataSchema: []
    };

    const lines = content.split('\n');
    let currentSection = null;
    let sectionContent = [];

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
      } else if (trimmed.startsWith('## Template')) {
        if (currentSection) {
          this.addSectionContent(sections, currentSection, sectionContent);
        }
        currentSection = 'template';
        sectionContent = [];
      } else if (trimmed.startsWith('## Metadata Schema')) {
        if (currentSection) {
          this.addSectionContent(sections, currentSection, sectionContent);
        }
        currentSection = 'metadataSchema';
        sectionContent = [];
      } else if (currentSection && trimmed) {
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
  addSectionContent(sections, sectionName, content) {
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
      case 'template':
        sections.template = text;
        break;
      case 'metadataSchema':
        sections.metadataSchema = content
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().substring(1).trim());
        break;
    }
  }

  /**
   * List all available note types
   */
  async listNoteTypes() {
    try {
      const workspaceRoot = this.workspace.rootPath;
      const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });

      const noteTypes = [];

      for (const entry of entries) {
        if (entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules') {

          const typePath = path.join(workspaceRoot, entry.name);
          const descriptionPath = path.join(typePath, '.description.md');
          const templatePath = path.join(typePath, '.template.md');

          // Check if this is a valid note type (has notes or description)
          const typeEntries = await fs.readdir(typePath);
          const hasNotes = typeEntries.some(file => file.endsWith('.md') && !file.startsWith('.'));
          const hasDescription = typeEntries.includes('.description.md');

          if (hasNotes || hasDescription) {
            // Get basic info about the note type
            let purpose = '';
            let hasTemplate = false;
            let noteCount = 0;

            try {
              if (hasDescription) {
                const description = await fs.readFile(descriptionPath, 'utf-8');
                const parsed = this.parseNoteTypeDescription(description);
                purpose = parsed.purpose;
              }

              hasTemplate = typeEntries.includes('.template.md');
              noteCount = typeEntries.filter(file =>
                file.endsWith('.md') && !file.startsWith('.')
              ).length;

            } catch (error) {
              // Continue with default values if there's an error reading details
            }

            noteTypes.push({
              name: entry.name,
              path: typePath,
              purpose: purpose || `Notes of type '${entry.name}'`,
              hasDescription,
              hasTemplate,
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
      throw new Error(`Failed to list note types: ${error.message}`);
    }
  }

  /**
   * Update an existing note type description
   */
  async updateNoteType(typeName, updates) {
    try {
      const noteType = await this.getNoteTypeDescription(typeName);

      // Update description if provided
      if (updates.description) {
        const descriptionPath = path.join(noteType.path, '.description.md');
        const newDescription = this.formatNoteTypeDescription(
          typeName,
          updates.description,
          updates.template || noteType.template
        );
        await fs.writeFile(descriptionPath, newDescription, 'utf-8');
      }

      // Update template if provided
      if (updates.template !== undefined) {
        const templatePath = path.join(noteType.path, '.template.md');
        if (updates.template) {
          await fs.writeFile(templatePath, updates.template, 'utf-8');
        } else {
          // Remove template if set to null/empty
          try {
            await fs.unlink(templatePath);
          } catch (error) {
            // Ignore if template doesn't exist
          }
        }
      }

      return await this.getNoteTypeDescription(typeName);
    } catch (error) {
      throw new Error(`Failed to update note type '${typeName}': ${error.message}`);
    }
  }

  /**
   * Delete a note type (only if it has no notes)
   */
  async deleteNoteType(typeName) {
    try {
      const typePath = this.workspace.getNoteTypePath(typeName);

      // Check if note type exists
      try {
        await fs.access(typePath);
      } catch (error) {
        throw new Error(`Note type '${typeName}' does not exist`);
      }

      // Check if there are any notes in this type
      const entries = await fs.readdir(typePath);
      const notes = entries.filter(file => file.endsWith('.md') && !file.startsWith('.'));

      if (notes.length > 0) {
        throw new Error(`Cannot delete note type '${typeName}': contains ${notes.length} notes`);
      }

      // Remove the directory and all its contents
      await fs.rm(typePath, { recursive: true, force: true });

      return {
        name: typeName,
        deleted: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to delete note type '${typeName}': ${error.message}`);
    }
  }

  /**
   * Get the template for a note type
   */
  async getNoteTypeTemplate(typeName) {
    try {
      const noteType = await this.getNoteTypeDescription(typeName);

      if (noteType.template) {
        return noteType.template;
      }

      // Return parsed template from description if no separate template file
      if (noteType.parsed.template) {
        return noteType.parsed.template;
      }

      // Return a basic template
      return `# ${typeName.charAt(0).toUpperCase() + typeName.slice(1)} Note\n\n## Content\n\n`;
    } catch (error) {
      throw new Error(`Failed to get template for note type '${typeName}': ${error.message}`);
    }
  }
}
