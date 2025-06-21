/**
 * Configuration Utilities
 *
 * Utilities for loading, validating, and managing jade-note configuration.
 */

import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';

export class ConfigManager {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.configPath = path.join(workspaceRoot, '.jade-note', 'config.yml');
    this.config = null;
  }

  /**
   * Load configuration from file
   */
  async load() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      this.config = yaml.load(configContent);
      this.validateConfig();
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create default config if file doesn't exist
        this.config = this.getDefaultConfig();
        await this.save();
        return this.config;
      }
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Save configuration to file
   */
  async save() {
    try {
      await this.ensureConfigDirectory();
      const configYaml = yaml.dump(this.config, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
        sortKeys: true
      });
      await fs.writeFile(this.configPath, configYaml, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      version: '1.0.0',
      workspace_root: '.',
      default_note_type: 'general',
      mcp_server: {
        name: 'jade-note',
        version: '0.1.0',
        port: 3000,
        log_level: 'info',
        log_file: '.jade-note/mcp-server.log'
      },
      search: {
        index_enabled: true,
        index_path: '.jade-note/search-index.json',
        rebuild_on_startup: false,
        max_results: 50
      },
      note_types: {
        auto_create_directories: true,
        require_descriptions: true,
        allow_custom_templates: true
      },
      features: {
        auto_linking: false,
        auto_tagging: false,
        content_analysis: false
      },
      security: {
        restrict_to_workspace: true,
        max_file_size: 10485760, // 10MB
        allowed_extensions: ['.md', '.txt']
      }
    };
  }

  /**
   * Validate configuration structure and values
   */
  validateConfig() {
    if (!this.config) {
      throw new Error('Configuration is null or undefined');
    }

    // Validate required fields
    const requiredFields = ['version', 'workspace_root', 'default_note_type'];
    for (const field of requiredFields) {
      if (!this.config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    // Validate default note type name
    if (!this.isValidNoteTypeName(this.config.default_note_type)) {
      throw new Error(`Invalid default note type name: ${this.config.default_note_type}`);
    }

    // Validate MCP server configuration
    if (this.config.mcp_server) {
      if (this.config.mcp_server.port &&
          (this.config.mcp_server.port < 1 || this.config.mcp_server.port > 65535)) {
        throw new Error('MCP server port must be between 1 and 65535');
      }

      const validLogLevels = ['debug', 'info', 'warn', 'error'];
      if (this.config.mcp_server.log_level &&
          !validLogLevels.includes(this.config.mcp_server.log_level)) {
        throw new Error(`Invalid log level: ${this.config.mcp_server.log_level}`);
      }
    }

    // Validate security settings
    if (this.config.security) {
      if (this.config.security.max_file_size &&
          (this.config.security.max_file_size < 1024 || this.config.security.max_file_size > 104857600)) {
        throw new Error('Max file size must be between 1KB and 100MB');
      }
    }
  }

  /**
   * Validate note type name for filesystem safety
   */
  isValidNoteTypeName(name) {
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
   * Ensure configuration directory exists
   */
  async ensureConfigDirectory() {
    const configDir = path.dirname(this.configPath);
    try {
      await fs.access(configDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(configDir, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Get configuration value by key path
   */
  get(keyPath, defaultValue = undefined) {
    if (!this.config) {
      return defaultValue;
    }

    const keys = keyPath.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Set configuration value by key path
   */
  set(keyPath, value) {
    if (!this.config) {
      this.config = this.getDefaultConfig();
    }

    const keys = keyPath.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Update configuration with partial updates
   */
  update(updates) {
    if (!this.config) {
      this.config = this.getDefaultConfig();
    }

    this.config = this.deepMerge(this.config, updates);
    this.validateConfig();
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Export configuration as JSON
   */
  toJSON() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  fromJSON(jsonString) {
    try {
      this.config = JSON.parse(jsonString);
      this.validateConfig();
    } catch (error) {
      throw new Error(`Failed to import configuration from JSON: ${error.message}`);
    }
  }
}

/**
 * Helper function to create a configuration manager
 */
export function createConfigManager(workspaceRoot) {
  return new ConfigManager(workspaceRoot);
}

/**
 * Helper function to load configuration
 */
export async function loadConfig(workspaceRoot) {
  const configManager = new ConfigManager(workspaceRoot);
  await configManager.load();
  return configManager.getConfig();
}

/**
 * Helper function to save configuration
 */
export async function saveConfig(workspaceRoot, config) {
  const configManager = new ConfigManager(workspaceRoot);
  configManager.config = config;
  configManager.validateConfig();
  await configManager.save();
}
