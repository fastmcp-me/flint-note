/**
 * Workspace Manager
 *
 * Handles initialization and management of jade-note workspaces,
 * including directory structure, configuration, and default note types.
 */

import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';

export class Workspace {
  constructor(rootPath) {
    this.rootPath = path.resolve(rootPath);
    this.jadeNoteDir = path.join(this.rootPath, '.jade-note');
    this.configPath = path.join(this.jadeNoteDir, 'config.yml');
    this.searchIndexPath = path.join(this.jadeNoteDir, 'search-index.json');
    this.logPath = path.join(this.jadeNoteDir, 'mcp-server.log');

    this.config = null;
  }

  /**
   * Initialize the workspace with required directories and files
   */
  async initialize() {
    try {
      // Create .jade-note directory if it doesn't exist
      await this.ensureDirectory(this.jadeNoteDir);

      // Load or create configuration
      await this.loadOrCreateConfig();

      // Create default note type if it doesn't exist
      await this.ensureDefaultNoteType();

      // Initialize search index
      await this.initializeSearchIndex();

    } catch (error) {
      throw new Error(`Failed to initialize workspace: ${error.message}`);
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Load existing config or create default configuration
   */
  async loadOrCreateConfig() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      this.config = yaml.load(configContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create default configuration
        this.config = this.getDefaultConfig();
        await this.saveConfig();
      } else {
        throw new Error(`Failed to load config: ${error.message}`);
      }
    }
  }

  /**
   * Get default configuration object
   */
  getDefaultConfig() {
    return {
      workspace_root: '.',
      default_note_type: 'general',
      mcp_server: {
        port: 3000,
        log_level: 'info'
      },
      search: {
        index_enabled: true,
        index_path: '.jade-note/search-index.json'
      },
      note_types: {
        auto_create_directories: true,
        require_descriptions: true
      }
    };
  }

  /**
   * Save current configuration to file
   */
  async saveConfig() {
    const configYaml = yaml.dump(this.config, {
      indent: 2,
      lineWidth: 80,
      noRefs: true
    });
    await fs.writeFile(this.configPath, configYaml, 'utf-8');
  }

  /**
   * Ensure the default note type exists
   */
  async ensureDefaultNoteType() {
    const defaultType = this.config.default_note_type;
    const defaultTypePath = path.join(this.rootPath, defaultType);

    await this.ensureDirectory(defaultTypePath);

    // Create .description.md if it doesn't exist
    const descriptionPath = path.join(defaultTypePath, '.description.md');
    try {
      await fs.access(descriptionPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const defaultDescription = this.getDefaultNoteTypeDescription(defaultType);
        await fs.writeFile(descriptionPath, defaultDescription, 'utf-8');
      }
    }
  }

  /**
   * Get default description for a note type
   */
  getDefaultNoteTypeDescription(typeName) {
    return `# ${typeName.charAt(0).toUpperCase() + typeName.slice(1)} Notes

## Purpose
General-purpose notes for miscellaneous thoughts, ideas, and information that don't fit into other specific categories.

## Agent Instructions
- Keep notes organized and well-structured
- Use clear headings and formatting
- Link to related notes when appropriate
- Extract actionable items when present

## Template (Optional)
# Title

## Context
Brief context or background information.

## Content
Main content goes here.

## Related
- Links to related notes
- References

## Actions
- [ ] Any action items extracted from the content

## Metadata Schema (Optional)
Expected frontmatter fields:
- tags: List of relevant tags
- created: Creation date
- updated: Last update date
`;
  }

  /**
   * Initialize search index file
   */
  async initializeSearchIndex() {
    try {
      await fs.access(this.searchIndexPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const emptyIndex = {
          version: '1.0.0',
          last_updated: new Date().toISOString(),
          notes: {}
        };
        await fs.writeFile(this.searchIndexPath, JSON.stringify(emptyIndex, null, 2), 'utf-8');
      }
    }
  }

  /**
   * Ensure a note type directory exists
   */
  async ensureNoteType(typeName) {
    // Validate note type name
    if (!this.isValidNoteTypeName(typeName)) {
      throw new Error(`Invalid note type name: ${typeName}`);
    }

    const typePath = path.join(this.rootPath, typeName);
    await this.ensureDirectory(typePath);

    // Create .description.md if required and doesn't exist
    if (this.config.note_types.require_descriptions) {
      const descriptionPath = path.join(typePath, '.description.md');
      try {
        await fs.access(descriptionPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          const description = this.getDefaultNoteTypeDescription(typeName);
          await fs.writeFile(descriptionPath, description, 'utf-8');
        }
      }
    }

    return typePath;
  }

  /**
   * Validate note type name for filesystem safety
   */
  isValidNoteTypeName(name) {
    // Must be non-empty, contain only safe characters, and not be a reserved name
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    const reservedNames = ['.jade-note', '.', '..', 'CON', 'PRN', 'AUX', 'NUL'];

    return (
      name &&
      name.length > 0 &&
      name.length <= 255 &&
      validPattern.test(name) &&
      !reservedNames.includes(name.toUpperCase())
    );
  }

  /**
   * Get the full path for a note type
   */
  getNoteTypePath(typeName) {
    return path.join(this.rootPath, typeName);
  }

  /**
   * Get the full path for a note file
   */
  getNotePath(typeName, filename) {
    return path.join(this.rootPath, typeName, filename);
  }

  /**
   * Validate that a path is within the workspace
   */
  isPathInWorkspace(filePath) {
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(this.rootPath);
    return resolvedPath.startsWith(resolvedRoot);
  }

  /**
   * Get workspace statistics
   */
  async getStats() {
    try {
      const entries = await fs.readdir(this.rootPath, { withFileTypes: true });
      const noteTypes = entries.filter(entry =>
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules'
      );

      let totalNotes = 0;
      for (const noteType of noteTypes) {
        const typePath = path.join(this.rootPath, noteType.name);
        const typeEntries = await fs.readdir(typePath);
        const notes = typeEntries.filter(file =>
          file.endsWith('.md') &&
          !file.startsWith('.')
        );
        totalNotes += notes.length;
      }

      return {
        workspace_root: this.rootPath,
        note_types: noteTypes.length,
        total_notes: totalNotes,
        config_version: this.config?.version || '1.0.0',
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get workspace stats: ${error.message}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Update configuration
   */
  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }
}
