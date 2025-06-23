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
import { LinkManager } from './core/links.ts';
import type { LinkRelationship } from './types/index.ts';
import fs from 'fs/promises';
import path from 'path';

interface CreateNoteTypeArgs {
  type_name: string;
  description: string;
  template?: string;
  agent_instructions?: string[];
}

interface CreateNoteArgs {
  type: string;
  title: string;
  content: string;
  use_template?: boolean;
  metadata?: Record<string, unknown>;
}

interface GetNoteArgs {
  identifier: string;
}

interface UpdateNoteArgs {
  identifier: string;
  content: string;
}

interface SearchNotesArgs {
  query?: string;
  type_filter?: string;
  limit?: number;
  use_regex?: boolean;
}

interface ListNoteTypesArgs {
  // Empty interface for consistency
  [key: string]: never;
}

interface LinkNotesArgs {
  source: string;
  target: string;
  relationship?: LinkRelationship;
  bidirectional?: boolean;
  context?: string;
}

interface GetNoteTypeTemplateArgs {
  type_name: string;
}

interface UpdateNoteTypeArgs {
  type_name: string;
  field: 'instructions' | 'description' | 'template' | 'metadata_schema';
  value: string;
}

interface GetNoteTypeInfoArgs {
  type_name: string;
}

class JadeNoteServer {
  #server: Server;
  #workspace: Workspace | null = null;
  #noteManager: NoteManager | null = null;
  #noteTypeManager: NoteTypeManager | null = null;
  #searchManager: SearchManager | null = null;
  #linkManager: LinkManager | null = null;

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
      this.#linkManager = new LinkManager(this.#workspace, this.#noteManager);

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
                },
                agent_instructions: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Optional custom agent instructions for this note type'
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
                },
                use_template: {
                  type: 'boolean',
                  description: 'Whether to use the note type template for structure',
                  default: false
                },
                metadata: {
                  type: 'object',
                  description:
                    'Additional metadata fields for the note (validated against note type schema)',
                  additionalProperties: true
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
            description:
              'Search notes by content and/or type. Empty queries return all notes sorted by last updated.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description:
                    'Search query or regex pattern. Empty string or omitted returns all notes.'
                },
                type_filter: {
                  type: 'string',
                  description: 'Optional filter by note type'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10
                },
                use_regex: {
                  type: 'boolean',
                  description: 'Enable regex pattern matching',
                  default: false
                }
              },
              required: []
            }
          },
          {
            name: 'list_note_types',
            description:
              'List all available note types with their purposes and agent instructions',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'link_notes',
            description:
              'Create explicit links between notes with optional relationship types',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Source note identifier (type/filename or title)'
                },
                target: {
                  type: 'string',
                  description: 'Target note identifier (type/filename or title)'
                },
                relationship: {
                  type: 'string',
                  description: 'Type of relationship between notes',
                  enum: [
                    'references',
                    'follows-up',
                    'contradicts',
                    'supports',
                    'mentions',
                    'depends-on',
                    'blocks',
                    'related-to'
                  ],
                  default: 'references'
                },
                bidirectional: {
                  type: 'boolean',
                  description: 'Create reverse link from target to source',
                  default: true
                },
                context: {
                  type: 'string',
                  description: 'Optional context about the relationship'
                }
              },
              required: ['source', 'target']
            }
          },
          {
            name: 'get_note_type_template',
            description: 'Get the template for a note type for preview or inspection',
            inputSchema: {
              type: 'object',
              properties: {
                type_name: {
                  type: 'string',
                  description: 'Name of the note type to get template for'
                }
              },
              required: ['type_name']
            }
          },
          {
            name: 'update_note_type',
            description: 'Update a specific field of an existing note type',
            inputSchema: {
              type: 'object',
              properties: {
                type_name: {
                  type: 'string',
                  description: 'Name of the note type to update'
                },
                field: {
                  type: 'string',
                  description: 'Field to update',
                  enum: ['instructions', 'description', 'template', 'metadata_schema']
                },
                value: {
                  type: 'string',
                  description: 'New value for the field'
                }
              },
              required: ['type_name', 'field', 'value']
            }
          },
          {
            name: 'get_note_type_info',
            description:
              'Get comprehensive information about a note type including instructions, description, and template',
            inputSchema: {
              type: 'object',
              properties: {
                type_name: {
                  type: 'string',
                  description: 'Name of the note type to get information for'
                }
              },
              required: ['type_name']
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
            return await this.#handleCreateNoteType(
              args as unknown as CreateNoteTypeArgs
            );
          case 'create_note':
            return await this.#handleCreateNote(args as unknown as CreateNoteArgs);
          case 'get_note':
            return await this.#handleGetNote(args as unknown as GetNoteArgs);
          case 'update_note':
            return await this.#handleUpdateNote(args as unknown as UpdateNoteArgs);
          case 'search_notes':
            return await this.#handleSearchNotes(args as unknown as SearchNotesArgs);
          case 'list_note_types':
            return await this.#handleListNoteTypes(args as unknown as ListNoteTypesArgs);
          case 'link_notes':
            return await this.#handleLinkNotes(args as unknown as LinkNotesArgs);
          case 'get_note_type_template':
            return await this.#handleGetNoteTypeTemplate(
              args as unknown as GetNoteTypeTemplateArgs
            );
          case 'update_note_type':
            return await this.#handleUpdateNoteType(
              args as unknown as UpdateNoteTypeArgs
            );
          case 'get_note_type_info':
            return await this.#handleGetNoteTypeInfo(
              args as unknown as GetNoteTypeInfoArgs
            );
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

    await this.#noteTypeManager.createNoteType(
      args.type_name,
      args.description,
      args.template,
      args.agent_instructions
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Created note type '${args.type_name}' successfully`,
              type_name: args.type_name
            },
            null,
            2
          )
        }
      ]
    };
  };

  #handleCreateNote = async (args: CreateNoteArgs) => {
    if (!this.#noteManager || !this.#noteTypeManager) {
      throw new Error('Server not initialized');
    }

    const noteInfo = await this.#noteManager.createNote(
      args.type,
      args.title,
      args.content,
      args.use_template || false,
      args.metadata || {}
    );

    // Get agent instructions for this note type
    let agentInstructions: string[] = [];
    let nextSuggestions = '';
    try {
      const typeInfo = await this.#noteTypeManager.getNoteTypeDescription(args.type);
      agentInstructions = typeInfo.parsed.agentInstructions;
      if (agentInstructions.length > 0) {
        nextSuggestions = `Consider following these guidelines for ${args.type} notes: ${agentInstructions.join(', ')}`;
      }
    } catch {
      // Ignore errors getting type info, continue without instructions
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...noteInfo,
              agent_instructions: agentInstructions,
              next_suggestions: nextSuggestions
            },
            null,
            2
          )
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

    const result = await this.#noteManager.updateNote(args.identifier, args.content);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  };

  #handleSearchNotes = async (args: SearchNotesArgs) => {
    if (!this.#searchManager) {
      throw new Error('Server not initialized');
    }

    const results = await this.#searchManager.searchNotes(
      args.query,
      args.type_filter,
      args.limit,
      args.use_regex
    );
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

  #handleLinkNotes = async (args: LinkNotesArgs) => {
    if (!this.#linkManager) {
      throw new Error('Server not initialized');
    }

    const result = await this.#linkManager.linkNotes(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  };

  #handleGetNoteTypeTemplate = async (args: GetNoteTypeTemplateArgs) => {
    if (!this.#noteTypeManager) {
      throw new Error('Server not initialized');
    }

    const template = await this.#noteTypeManager.getNoteTypeTemplate(args.type_name);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              type_name: args.type_name,
              template: template,
              available_variables: [
                '{{title}}',
                '{{type}}',
                '{{created}}',
                '{{updated}}',
                '{{date}}',
                '{{time}}',
                '{{content}}'
              ]
            },
            null,
            2
          )
        }
      ]
    };
  };

  #handleUpdateNoteType = async (args: UpdateNoteTypeArgs) => {
    if (!this.#noteTypeManager) {
      throw new Error('Server not initialized');
    }

    // Get current note type info
    const currentInfo = await this.#noteTypeManager.getNoteTypeDescription(
      args.type_name
    );

    // Update based on field type
    let updatedDescription: string;
    let updatedTemplate: string | null = currentInfo.template;

    switch (args.field) {
      case 'instructions': {
        // Parse instructions from value (can be newline-separated or bullet points)
        const instructions = args.value
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => (line.startsWith('-') ? line.substring(1).trim() : line))
          .map(line => `- ${line}`)
          .join('\n');

        // Use the current description and replace the agent instructions section
        updatedDescription = currentInfo.description.replace(
          /## Agent Instructions\n[\s\S]*?(?=\n## |$)/,
          `## Agent Instructions\n${instructions}\n`
        );
        break;
      }

      case 'description':
        updatedDescription = this.#noteTypeManager.formatNoteTypeDescription(
          args.type_name,
          args.value,
          currentInfo.template
        );
        break;

      case 'template':
        updatedTemplate = args.value;
        updatedDescription = this.#noteTypeManager.formatNoteTypeDescription(
          args.type_name,
          currentInfo.parsed.purpose,
          args.value
        );
        break;

      case 'metadata_schema': {
        // Parse metadata schema from value
        const schema = args.value
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => (line.startsWith('-') ? line.substring(1).trim() : line))
          .map(line => `- ${line}`)
          .join('\n');

        updatedDescription = currentInfo.description.replace(
          /## Metadata Schema\n[\s\S]*$/,
          `## Metadata Schema\nExpected frontmatter or metadata fields for this note type:\n${schema}\n`
        );
        break;
      }

      default:
        throw new Error(`Invalid field: ${args.field}`);
    }

    // Write the updated description to the file
    const descriptionPath = path.join(currentInfo.path, '.description.md');
    await fs.writeFile(descriptionPath, updatedDescription, 'utf-8');

    // Update template if needed
    if (updatedTemplate !== currentInfo.template) {
      await this.#noteTypeManager.updateNoteType(args.type_name, {
        template: updatedTemplate
      });
    }

    // Get the updated note type info
    const result = await this.#noteTypeManager.getNoteTypeDescription(args.type_name);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              type_name: args.type_name,
              field_updated: args.field,
              updated_info: {
                name: result.name,
                purpose: result.parsed.purpose,
                agent_instructions: result.parsed.agentInstructions,
                has_template: result.hasTemplate,
                template: result.template
              }
            },
            null,
            2
          )
        }
      ]
    };
  };

  #handleGetNoteTypeInfo = async (args: GetNoteTypeInfoArgs) => {
    if (!this.#noteTypeManager) {
      throw new Error('Server not initialized');
    }

    const info = await this.#noteTypeManager.getNoteTypeDescription(args.type_name);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              type_name: info.name,
              description: info.parsed.purpose,
              agent_instructions: info.parsed.agentInstructions,
              template: info.template,
              metadata_schema: info.parsed.metadataSchema,
              has_template: info.hasTemplate,
              path: info.path
            },
            null,
            2
          )
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
    if (!this.#noteManager) {
      throw new Error('Server not initialized');
    }

    const recentNotes = await this.#noteManager.listNotes(undefined, 20);
    return {
      contents: [
        {
          uri: 'jade-note://recent',
          mimeType: 'application/json',
          text: JSON.stringify(recentNotes, null, 2)
        }
      ]
    };
  };

  #handleStatsResource = async () => {
    if (!this.#workspace) {
      throw new Error('Server not initialized');
    }

    const stats = await this.#workspace.getStats();
    return {
      contents: [
        {
          uri: 'jade-note://stats',
          mimeType: 'application/json',
          text: JSON.stringify(stats, null, 2)
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
  const workspacePath = process.env.JADE_NOTE_WORKSPACE || process.cwd();
  await server.initialize(workspacePath);
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
