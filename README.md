# jade-note Design Document

## Overview

**jade-note** is an agent-first note-taking application designed to help users maintain and interact with their personal knowledge base through natural language interfaces. Unlike traditional note-taking apps that add AI features as an afterthought, jade-note is architected from the ground up to be agent-native.

## Vision

Create a note-taking system where:
- Users interact primarily through natural language with AI agents
- Notes are organized by user-defined "types" with semantic meaning
- The system understands the purpose and context of different note categories
- Data remains portable and user-owned through simple file storage
- Integration is seamless with any MCP-compatible chat client

## Core Principles

1. **Agent-First**: Design every feature with AI agent interaction as the primary interface
2. **User Ownership**: All data stored as simple files in user-controlled directories
3. **Semantic Organization**: Note types carry meaning that agents can understand and act upon
4. **Template-Driven**: Consistent structure through customizable templates with variable substitution
5. **Extensible**: Easy to add new note types and agent behaviors
6. **Portable**: No vendor lock-in, works with standard file systems and version control

## Architecture

### File System Structure

```
jade-note-workspace/
├── .jade-note/
│   ├── config.yml              # Global configuration
│   ├── search-index.json       # Search index cache
│   └── mcp-server.log         # MCP server logs
├── {note-type-1}/
│   ├── .description.md        # Type definition and agent instructions
│   ├── .template.md          # Optional default template
│   ├── note-1.md
│   └── note-2.md
├── {note-type-2}/
│   ├── .description.md
│   └── another-note.md
└── general/                   # Default note type
    ├── .description.md
    └── misc-thoughts.md
```

### Note Type Definition

Each note type directory contains a `.description.md` file that defines:

```markdown
# {Note Type Name}

## Purpose
Brief description of what this note type is for.

## Agent Instructions
- Specific behaviors agents should exhibit for this note type
- Auto-extraction rules (e.g., "extract action items from meeting notes")
- Linking suggestions (e.g., "link to related project notes")
- Content enhancement suggestions

## Template (Optional)
# {{title}}

**Created:** {{date}} at {{time}}
**Type:** {{type}}

## Content
{{content}}

## Actions
- [ ] Review and process

## Metadata Schema (Optional)
Expected frontmatter or metadata fields for this note type.
```

### MCP Server Interface

The jade-note MCP server exposes the following tools and resources:

#### Tools

| Tool Name | Purpose | Parameters |
|:----------|:--------|:-----------|
| `create_note_type` | Create new note type with description | `type_name`, `description`, `template?` |
| `create_note` | Create new note of specified type | `type`, `title`, `content`, `use_template?` |
| `get_note` | Retrieve specific note | `identifier` |
| `update_note` | Update existing note | `identifier`, `content` |
| `search_notes` | Search notes by content/type | `query`, `type_filter?`, `limit?`, `use_regex?` |
| `list_note_types` | List all available note types | none |
| `link_notes` | Create explicit links between notes | `source`, `target`, `relationship?` |
| `get_note_type_template` | Get template for a note type | `type_name` |
| `analyze_note` | Get AI analysis/suggestions for a note | `identifier` |

#### Resources

| Resource URI | Description | Content |
|:-------------|:------------|:--------|
| `jade-note://types` | Available note types and descriptions | JSON list of types |
| `jade-note://recent` | Recently modified notes | JSON list of recent notes |
| `jade-note://stats` | Workspace statistics | JSON with counts, types, etc. |

## MVP Feature Set

### Phase 1: Core Functionality
- [x] File-based note storage
- [x] Note type system with `.description.md`
- [x] Basic MCP server with CRUD operations
- [x] Simple search functionality
- [x] Integration with MCP-compatible clients
- [x] Template-based note creation with variable substitution

### Phase 2: Agent Intelligence
- [ ] Content-based note type suggestions
- [ ] Automatic note linking based on content similarity
- [ ] Content enhancement suggestions
- [ ] Action item extraction and tracking

### Phase 3: Advanced Features
- [ ] Full-text search with semantic similarity
- [ ] Note relationship visualization
- [ ] Batch operations on note collections
- [ ] Export/import functionality
- [ ] Plugin system for custom note types

## Technical Specifications

### Dependencies
- **Runtime**: Node.js 18+
- **MCP SDK**: @modelcontextprotocol/sdk
- **File Operations**: Node.js fs/promises
- **Search**: Simple text search with regex support, with plans for vector search
- **Configuration**: YAML parsing (js-yaml)

### Configuration Schema

```yaml
# .jade-note/config.yml
workspace_root: "."
default_note_type: "general"
mcp_server:
  port: 3000
  log_level: "info"
search:
  index_enabled: true
  index_path: ".jade-note/search-index.json"
note_types:
  auto_create_directories: true
  require_descriptions: true
```

### Error Handling
- Graceful handling of missing directories
- Validation of note type names (filesystem-safe)
- Concurrent file access protection
- MCP protocol error responses
- Regex validation and error handling for malformed patterns

### Security Considerations
- Restrict file operations to workspace directory
- Validate all file paths to prevent directory traversal
- No execution of user-provided code
- Read-only access to system files

## User Experience

### Typical Workflows

#### Creating a New Note Type
```
User: "I want to create a note type for tracking my reading notes"

Agent: I'll create a new note type for reading notes.
[Creates directory and .description.md with appropriate template]

User: "Make sure it includes fields for author, key insights, and my rating"

Agent: I'll update the template to include those fields.
[Updates .description.md with enhanced template]
```

#### Adding Notes
```
User: "Add a reading note for 'Atomic Habits' by James Clear"

Agent: I'll create a new reading note for that book.
[Creates note with template, fills in known information]

User: "The key insight is that small changes compound over time"

Agent: I'll add that insight to your note.
[Updates the note with the insight]
```

#### Searching and Connecting
```
User: "What notes do I have about habit formation?"

Agent: I found several notes related to habit formation...
[Searches across all notes, returns relevant results]

User: "Find all notes that mention dates in YYYY-MM-DD format"

Agent: I'll search using a regex pattern to find date mentions.
[Searches with regex pattern \d{4}-\d{2}-\d{2} across all notes]

User: "Link my Atomic Habits note to my other productivity notes"

Agent: I'll create connections between your habit and productivity notes.
[Analyzes content and creates appropriate links]
```

## Future Considerations

### Scalability
- Implement incremental search indexing for large note collections
- Consider database backend for metadata while keeping notes as files
- Optimize file watching for large directories

### Integration Opportunities
- Git integration for version control
- Sync with cloud storage providers
- Export to other note-taking formats
- Integration with calendar/task management systems

### Advanced AI Features
- Automatic note summarization
- Content gap analysis ("You have lots of notes about X but nothing about Y")
- Periodic knowledge base reviews and suggestions
- Cross-note insight generation

## Success Metrics

### MVP Success Criteria
- [ ] Successfully create and manage note types through MCP
- [ ] Seamless integration with at least one MCP client
- [ ] Basic search and retrieval functionality
- [ ] File system remains clean and portable

### Long-term Success Indicators
- User retention and daily active usage
- Quality of agent suggestions and automations
- Speed and accuracy of search functionality
- Community adoption and contribution

---

*This design document is a living document and will evolve as the project develops.*