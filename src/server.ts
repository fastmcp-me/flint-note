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
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { Workspace } from './core/workspace.ts';
import { NoteManager } from './core/notes.ts';
import { NoteTypeManager } from './core/note-types.ts';
import { SearchManager } from './core/search.ts';

interface CreateNoteTypeArgs {
  type_name: string;
  description: string;
  template?: string;
}

interface CreateNoteArgs {
  type: string;
  title: string;
  content: string;
}

interface GetNoteArgs {
  identifier: string;
}

interface UpdateNoteArgs {
  identifier: string;
  content: string;
}

interface SearchNotesArgs {
  query: string;
  type_filter?: string;
  limit?: number;
}

interface ListNoteTypesArgs {
  // Empty interface for consistency
  [key: string]: never;
}

class JadeNoteServer {
  #server: Server;
  #workspace: Workspace | null = null;
  #noteManager: NoteManager | null = null;
  #noteTypeManager: NoteTypeManager | null = null;
  #searchManager: SearchManager | null = null;

  constructor() {
    this.#server = new Server(
      {
        name: 'jade-note',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.#setupHandlers();
  }

  async initialize(workspacePath: string = process.cwd()): Promise<void> {
    try {
      this.#workspace = new Workspace(workspacePath);
      await this.#workspace.initialize();

      this.#noteManager = new NoteManager(this.#workspace);
      this.#noteTypeManager = new NoteTypeManager(this.#workspace);
      this.#searchManager = new SearchManager(this.#workspace);

      console.error('jade-note server initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to initialize jade-note server:', errorMessage);
      process.exit(1);
    }
  }

  #setupHandlers(): void {
    // List available tools
    this.#server.setRequestHandler(ListToolsRequestSchema, async () => {
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
                  description: 'Name of the note type (filesystem-safe)'
                },
                description: {
                  type: 'string',
                  description: 'Description of the note type purpose and usage'
                },
                template: {
                  type: 'string',
                  description: 'Optional template content for new notes of this type'
                }
              },
              required: ['type_name', 'description']
            }
          },
          {
            name: 'create_note',
            description: 'Create a new note of the specified type',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Note type (must exist)'
                },
                title: {
                  type: 'string',
                  description: 'Title of the note'
                },
                content: {
                  type: 'string',
                  description: 'Content of the note in markdown format'
                }
              },
              required: ['type', 'title', 'content']
            }
          },
          {
            name: 'get_note',
            description: 'Retrieve a specific note by identifier',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Note identifier in format "type/filename" or full path'
                }
              },
              required: ['identifier']
            }
          },
          {
            name: 'update_note',
            description: 'Update an existing note',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Note identifier in format "type/filename" or full path'
                },
                content: {
                  type: 'string',
                  description: 'New content for the note'
                }
              },
              required: ['identifier', 'content']
            }
          },
          {
            name: 'search_notes',
            description: 'Search notes by content and/or type',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query'
                },
                type_filter: {
                  type: 'string',
                  description: 'Optional filter by note type'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10
                }
              },
              required: ['query']
            }
          },
          {
            name: 'list_note_types',
            description: 'List all available note types',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.#server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_note_type':
            return await this.#handleCreateNoteType(args as any);
          case 'create_note':
            return await this.#handleCreateNote(args as any);
          case 'get_note':
            return await this.#handleGetNote(args as any);
          case 'update_note':
            return await this.#handleUpdateNote(args as any);
          case 'search_notes':
            return await this.#handleSearchNotes(args as any);
          case 'list_note_types':
            return await this.#handleListNoteTypes(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    });

    // List available resources
    this.#server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'jade-note://types',
            mimeType: 'application/json',
            name: 'Available note types',
            description: 'List of all available note types with their descriptions'
          },
          {
            uri: 'jade-note://recent',
            mimeType: 'application/json',
            name: 'Recently modified notes',
            description: 'List of recently modified notes'
          },
          {
            uri: 'jade-note://stats',
            mimeType: 'application/json',
            name: 'Workspace statistics',
            description: 'Statistics about the current workspace'
          }
        ]
      };
    });

    // Handle resource requests
    this.#server.setRequestHandler(ReadResourceRequestSchema, async request => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case 'jade-note://types':
            return await this.#handleTypesResource();
          case 'jade-note://recent':
            return await this.#handleRecentResource();
          case 'jade-note://stats':
            return await this.#handleStatsResource();
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to read resource ${uri}: ${errorMessage}`);
      }
    });
  }

  // Tool handlers
  #handleCreateNoteType = async (args: CreateNoteTypeArgs) => {
    if (!this.#noteTypeManager) {
      throw new Error('Server not initialized');
    }

    await this.#noteTypeManager.createNoteType(args.type_name, args.description, args.template);
    return {
      content: [
        {
          type: 'text',
          text: `Created note type '${args.type_name}' successfully`
        }
      ]
    };
  };

  #handleCreateNote = async (args: CreateNoteArgs) => {
    if (!this.#noteManager) {
      throw new Error('Server not initialized');
    }

    await this.#noteManager.createNote(args.type, args.title, args.content);
    return {
      content: [
        {
          type: 'text',
          text: `Created note '${args.title}' in type '${args.type}'`
        }
      ]
    };
  };

  #handleGetNote = async (args: GetNoteArgs) => {
    if (!this.#noteManager) {
      throw new Error('Server not initialized');
    }

    const note = await this.#noteManager.getNote(args.identifier);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(note, null, 2)
        }
      ]
    };
  };

  #handleUpdateNote = async (args: UpdateNoteArgs) => {
    if (!this.#noteManager) {
      throw new Error('Server not initialized');
    }

    await this.#noteManager.updateNote(args.identifier, args.content);
    return {
      content: [
        {
          type: 'text',
          text: `Updated note '${args.identifier}' successfully`
        }
      ]
    };
  };

  #handleSearchNotes = async (args: SearchNotesArgs) => {
    if (!this.#searchManager) {
      throw new Error('Server not initialized');
    }

    const results = await this.#searchManager.searchNotes(args.query, args.type_filter, args.limit);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  };

  #handleListNoteTypes = async (_args: ListNoteTypesArgs) => {
    if (!this.#noteTypeManager) {
      throw new Error('Server not initialized');
    }

    const types = await this.#noteTypeManager.listNoteTypes();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(types, null, 2)
        }
      ]
    };
  };

  // Resource handlers
  #handleTypesResource = async () => {
    if (!this.#noteTypeManager) {
      throw new Error('Server not initialized');
    }

    const types = await this.#noteTypeManager.listNoteTypes();
    return {
      contents: [
        {
          uri: 'jade-note://types',
          mimeType: 'application/json',
          text: JSON.stringify(types, null, 2)
        }
      ]
    };
  };

  #handleRecentResource = async () => {
    // TODO: Implement recent notes functionality
    return {
      contents: [
        {
          uri: 'jade-note://recent',
          mimeType: 'application/json',
          text: JSON.stringify([], null, 2)
        }
      ]
    };
  };

  #handleStatsResource = async () => {
    // TODO: Implement workspace statistics
    return {
      contents: [
        {
          uri: 'jade-note://stats',
          mimeType: 'application/json',
          text: JSON.stringify({ note_count: 0, type_count: 0 }, null, 2)
        }
      ]
    };
  };

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.#server.connect(transport);
    console.error('jade-note MCP server running on stdio');
  }
}

// Main execution
async function main(): Promise<void> {
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
  main().catch((error: Error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
