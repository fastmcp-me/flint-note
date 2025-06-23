/**
 * Workspace Manager
 *
 * Handles initialization and management of jade-note workspaces,
 * including directory structure, configuration, and default note types.
 */

import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';

interface WorkspaceConfig {
  workspace_root: string;
  default_note_type: string;
  mcp_server: {
    port: number;
    log_level: string;
  };
  search: {
    index_enabled: boolean;
    index_path: string;
  };
  note_types: {
    auto_create_directories: boolean;
    require_descriptions: boolean;
  };
  version?: string;
}

interface WorkspaceStats {
  workspace_root: string;
  note_types: number;
  total_notes: number;
  config_version: string;
  last_updated: string;
}

export class Workspace {
  public readonly rootPath: string;
  public readonly jadeNoteDir: string;
  public readonly configPath: string;
  public readonly searchIndexPath: string;
  public readonly logPath: string;
  public config: WorkspaceConfig | null = null;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
    this.jadeNoteDir = path.join(this.rootPath, '.jade-note');
    this.configPath = path.join(this.jadeNoteDir, 'config.yml');
    this.searchIndexPath = path.join(this.jadeNoteDir, 'search-index.json');
    this.logPath = path.join(this.jadeNoteDir, 'mcp-server.log');
  }

  /**
   * Initialize the workspace with required directories and files
   */
  async initialize(): Promise<void> {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize workspace: ${errorMessage}`);
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Load existing config or create default configuration
   */
  async loadOrCreateConfig(): Promise<void> {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      this.config = yaml.load(configContent) as WorkspaceConfig;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // Create default configuration
        this.config = this.getDefaultConfig();
        await this.saveConfig();
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to load config: ${errorMessage}`);
      }
    }
  }

  /**
   * Get default configuration object
   */
  getDefaultConfig(): WorkspaceConfig {
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
  async saveConfig(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to save');
    }

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
  async ensureDefaultNoteType(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const defaultType = this.config.default_note_type;
    const defaultTypePath = path.join(this.rootPath, defaultType);

    await this.ensureDirectory(defaultTypePath);

    // Create _description.md if it doesn't exist
    const descriptionPath = path.join(defaultTypePath, '_description.md');
    try {
      await fs.access(descriptionPath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        const defaultDescription = this.getDefaultNoteTypeDescription(defaultType);
        await fs.writeFile(descriptionPath, defaultDescription, 'utf-8');
      }
    }
  }

  /**
   * Get default description for a note type
   */
  getDefaultNoteTypeDescription(typeName: string): string {
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
  async initializeSearchIndex(): Promise<void> {
    try {
      await fs.access(this.searchIndexPath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        const emptyIndex = {
          version: '1.0.0',
          last_updated: new Date().toISOString(),
          notes: {}
        };
        await fs.writeFile(
          this.searchIndexPath,
          JSON.stringify(emptyIndex, null, 2),
          'utf-8'
        );
      }
    }
  }

  /**
   * Ensure a note type directory exists
   */
  async ensureNoteType(typeName: string): Promise<string> {
    // Validate note type name
    if (!this.isValidNoteTypeName(typeName)) {
      throw new Error(`Invalid note type name: ${typeName}`);
    }

    const typePath = path.join(this.rootPath, typeName);
    await this.ensureDirectory(typePath);

    // Create _description.md if required and doesn't exist
    if (this.config?.note_types.require_descriptions) {
      const descriptionPath = path.join(typePath, '_description.md');
      try {
        await fs.access(descriptionPath);
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
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
  isValidNoteTypeName(name: string): boolean {
    // Must be non-empty, contain only safe characters, and not be a reserved name
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    const reservedNames = ['.jade-note', '.', '..', 'CON', 'PRN', 'AUX', 'NUL'];

    return (
      Boolean(name) &&
      name.length > 0 &&
      name.length <= 255 &&
      validPattern.test(name) &&
      !reservedNames.includes(name.toUpperCase())
    );
  }

  /**
   * Get the full path for a note type
   */
  getNoteTypePath(typeName: string): string {
    return path.join(this.rootPath, typeName);
  }

  /**
   * Get the full path for a note file
   */
  getNotePath(typeName: string, filename: string): string {
    return path.join(this.rootPath, typeName, filename);
  }

  /**
   * Validate that a path is within the workspace
   */
  isPathInWorkspace(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(this.rootPath);
    return resolvedPath.startsWith(resolvedRoot);
  }

  /**
   * Get workspace statistics
   */
  async getStats(): Promise<WorkspaceStats> {
    try {
      const entries = await fs.readdir(this.rootPath, { withFileTypes: true });
      const noteTypes = entries.filter(
        entry =>
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules'
      );

      let totalNotes = 0;
      for (const noteType of noteTypes) {
        const typePath = path.join(this.rootPath, noteType.name);
        const typeEntries = await fs.readdir(typePath);
        const notes = typeEntries.filter(
          file => file.endsWith('.md') && !file.startsWith('.') && !file.startsWith('_')
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get workspace stats: ${errorMessage}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): WorkspaceConfig | null {
    return this.config;
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<WorkspaceConfig>): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }
}
