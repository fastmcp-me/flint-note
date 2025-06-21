#!/usr/bin/env node

/**
 * jade-note MCP Server
 *
 * Main entry point for the jade-note MCP server that provides
 * agent-first note-taking functionality.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { Workspace } from './core/workspace.js';
import { NoteManager } from './core/notes.js';
import { NoteTypeManager } from './core/note-types.js';
import { SearchManager } from './core/search.js';

class JadeNoteServer {
  constructor() {
    this.server = new Server(
      {
        name: 'jade-note',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize core managers
    this.workspace = null;
    this.noteManager = null;
    this.noteTypeManager = null;
    this.searchManager = null;

    this.setupHandlers();
  }

  async initialize(workspacePath = process.cwd()) {
    try {
      this.workspace = new Workspace(workspacePath);
      await this.workspace.initialize();

      this.noteManager = new NoteManager(this.workspace);
      this.noteTypeManager = new NoteTypeManager(this.workspace);
      this.searchManager = new SearchManager(this.workspace);

      console.error('jade-note server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize jade-note server:', error.message);
      process.exit(1);
    }
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_note_type',
            description: 'Create a new note type with description and optional template',
            inputSchema: {
              type: 'object',
              properties: {
                type_name: {
                  type: 'string',
                  description: 'Name of the note type (filesystem-safe)',
                },
                description: {
                  type: 'string',
                  description: 'Description of the note type purpose and usage',
                },
                template: {
                  type: 'string',
                  description: 'Optional template content for new notes of this type',
                },
              },
              required: ['type_name', 'description'],
            },
          },
          {
            name: 'create_note',
            description: 'Create a new note of the specified type',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Note type (must exist)',
                },
                title: {
                  type: 'string',
                  description: 'Title of the note',
                },
                content: {
                  type: 'string',
                  description: 'Content of the note in markdown format',
                },
              },
              required: ['type', 'title', 'content'],
            },
          },
          {
            name: 'get_note',
            description: 'Retrieve a specific note by identifier',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Note identifier in format "type/filename" or full path',
                },
              },
              required: ['identifier'],
            },
          },
          {
            name: 'update_note',
            description: 'Update an existing note',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Note identifier in format "type/filename" or full path',
                },
                content: {
                  type: 'string',
                  description: 'New content for the note',
                },
              },
              required: ['identifier', 'content'],
            },
          },
          {
            name: 'search_notes',
            description: 'Search notes by content and/or type',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
                type_filter: {
                  type: 'string',
                  description: 'Optional filter by note type',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'list_note_types',
            description: 'List all available note types',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_note_type':
            return await this.handleCreateNoteType(args);
          case 'create_note':
            return await this.handleCreateNote(args);
          case 'get_note':
            return await this.handleGetNote(args);
          case 'update_note':
            return await this.handleUpdateNote(args);
          case 'search_notes':
            return await this.handleSearchNotes(args);
          case 'list_note_types':
            return await this.handleListNoteTypes(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'jade-note://types',
            mimeType: 'application/json',
            name: 'Available note types',
            description: 'List of all available note types with their descriptions',
          },
          {
            uri: 'jade-note://recent',
            mimeType: 'application/json',
            name: 'Recently modified notes',
            description: 'List of recently modified notes',
          },
          {
            uri: 'jade-note://stats',
            mimeType: 'application/json',
            name: 'Workspace statistics',
            description: 'Statistics about the current workspace',
          },
        ],
      };
    });

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case 'jade-note://types':
            return await this.handleTypesResource();
          case 'jade-note://recent':
            return await this.handleRecentResource();
          case 'jade-note://stats':
            return await this.handleStatsResource();
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        throw new Error(`Failed to read resource ${uri}: ${error.message}`);
      }
    });
  }

  // Tool handlers (placeholder implementations)
  async handleCreateNoteType(args) {
    const result = await this.noteTypeManager.createNoteType(
      args.type_name,
      args.description,
      args.template
    );
    return {
      content: [
        {
          type: 'text',
          text: `Created note type '${args.type_name}' successfully`,
        },
      ],
    };
  }

  async handleCreateNote(args) {
    const result = await this.noteManager.createNote(
      args.type,
      args.title,
      args.content
    );
    return {
      content: [
        {
          type: 'text',
          text: `Created note '${args.title}' in type '${args.type}'`,
        },
      ],
    };
  }

  async handleGetNote(args) {
    const note = await this.noteManager.getNote(args.identifier);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(note, null, 2),
        },
      ],
    };
  }

  async handleUpdateNote(args) {
    await this.noteManager.updateNote(args.identifier, args.content);
    return {
      content: [
        {
          type: 'text',
          text: `Updated note '${args.identifier}' successfully`,
        },
      ],
    };
  }

  async handleSearchNotes(args) {
    const results = await this.searchManager.searchNotes(
      args.query,
      args.type_filter,
      args.limit
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  async handleListNoteTypes(args) {
    const types = await this.noteTypeManager.listNoteTypes();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(types, null, 2),
        },
      ],
    };
  }

  // Resource handlers (placeholder implementations)
  async handleTypesResource() {
    const types = await this.noteTypeManager.listNoteTypes();
    return {
      contents: [
        {
          uri: 'jade-note://types',
          mimeType: 'application/json',
          text: JSON.stringify(types, null, 2),
        },
      ],
    };
  }

  async handleRecentResource() {
    // TODO: Implement recent notes functionality
    return {
      contents: [
        {
          uri: 'jade-note://recent',
          mimeType: 'application/json',
          text: JSON.stringify([], null, 2),
        },
      ],
    };
  }

  async handleStatsResource() {
    // TODO: Implement workspace statistics
    return {
      contents: [
        {
          uri: 'jade-note://stats',
          mimeType: 'application/json',
          text: JSON.stringify({ note_count: 0, type_count: 0 }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('jade-note MCP server running on stdio');
  }
}

// Main execution
async function main() {
  const server = new JadeNoteServer();
  await server.initialize();
  await server.run();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down jade-note server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down jade-note server...');
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
