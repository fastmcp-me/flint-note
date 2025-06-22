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

## Agent Instructions System

The agent instructions system is a core feature that enables users to define specific behaviors and guidance for AI agents when working with different note types. This creates a personalized, context-aware experience where agents understand the purpose and conventions of each note category.

### How Agent Instructions Work

1. **Per-Note-Type Guidance**: Each note type can have its own set of agent instructions
2. **Automatic Context**: When agents work with notes, they automatically receive relevant instructions
3. **User-Customizable**: Instructions can be easily updated using natural language through the MCP interface
4. **Contextual Responses**: Note creation responses include agent instructions and helpful suggestions

### Example Agent Instructions

```markdown
## Reading Notes
- Always ask about the author's background and credentials
- Extract key insights and actionable takeaways
- Ask for the user's personal rating and recommendation
- Suggest connections to previously read books

## Project Notes  
- Always ask about project goals and success criteria
- Extract and track action items with owners and deadlines
- Suggest next steps and potential blockers
- Link to related project documentation

## Meeting Notes
- Extract attendees, decisions made, and action items
- Identify follow-up meetings or deadlines
- Suggest creating linked notes for action items
- Ask about meeting effectiveness and outcomes
```

### Benefits

- **Consistent Experience**: Agents behave predictably within each note category
- **Personalized Workflow**: Instructions reflect your specific needs and conventions  
- **Reduced Cognitive Load**: Agents proactively suggest relevant actions and connections
- **Scalable Organization**: Easy to maintain consistent practices across large note collections

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
| `create_note_type` | Create new note type with description | `type_name`, `description`, `template?`, `agent_instructions?` |
| `create_note` | Create new note of specified type | `type`, `title`, `content`, `use_template?` |
| `get_note` | Retrieve specific note | `identifier` |
| `update_note` | Update existing note | `identifier`, `content` |
| `search_notes` | Search notes by content/type | `query`, `type_filter?`, `limit?`, `use_regex?` |
| `list_note_types` | List all available note types | none |
| `link_notes` | Create explicit links between notes | `source`, `target`, `relationship?` |
| `get_note_type_template` | Get template for a note type | `type_name` |
| `update_note_type` | Update specific field of existing note type | `type_name`, `field` (instructions\|description\|template\|metadata_schema), `value` |
| `get_note_type_info` | Get comprehensive note type information including agent instructions | `type_name` |
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
- [x] Agent instruction management and integration
- [x] Note type field updates (instructions, description, template, metadata)

### Phase 2: Agent Intelligence
- [x] Agent instructions integration with note creation
- [x] Contextual agent guidance based on note types
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

#### Creating Note Type with Custom Agent Instructions
```
User: "Create a book review note type with specific agent guidance"

Agent: I'll create a book review note type. What specific guidance should agents follow?

User: "Always ask for the author's credentials, extract key quotes with page numbers, ask for my rating out of 5 stars, and suggest related books"

Agent: Perfect! I'll create the note type with those custom agent instructions.
[Uses create_note_type with agent_instructions: ["Always ask for the author's credentials and background", "Extract key quotes with specific page numbers", "Ask for personal rating out of 5 stars", "Suggest related books from the same genre or author"]]

User: "Add a book review for 'Atomic Habits'"

Agent: I'll create your book review. Can you tell me about James Clear's background and credentials as an author? Also, what would you rate this book out of 5 stars?
[Creates note following the custom agent instructions automatically]
```

#### Adding Notes with Agent Intelligence
```
User: "Add a reading note for 'Atomic Habits' by James Clear"

Agent: I'll create a new reading note for that book. Based on your reading note guidelines, I should also ask about the author's background and your rating.
[Creates note with template, includes agent instructions: "Always ask about author's background", "Extract key insights", "Ask for user's rating"]

User: "The key insight is that small changes compound over time"

Agent: I'll add that insight to your note. James Clear is a well-known habits researcher - what's your overall rating for this book, and would you recommend it to others?
[Updates the note with the insight, following agent instructions to ask for rating]
```

#### Managing Agent Instructions
```
User: "Update my reading notes so agents should always ask about the author's background"

Agent: I'll update the agent instructions for your reading notes.
[Uses update_note_type("reading", "instructions", "- Always ask about author's background\n- Extract key insights\n- Ask for user's rating")]

User: "What guidance do agents have for project notes?"

Agent: Let me check the agent instructions for project notes.
[Uses get_note_type_info("project") to retrieve: ["Always ask about project goals", "Extract action items", "Suggest next steps", "Track deadlines"]]

User: "Change the template for meeting notes to include action items"

Agent: I'll update the template for your meeting notes.
[Uses update_note_type("meetings", "template", "# {{title}}\n\n**Date:** {{date}}\n\n## Action Items\n\n")]

User: "Make sure agents help me track deadlines in project notes"

Agent: I'll add deadline tracking to your project note instructions.
[Uses update_note_type("projects", "instructions", "- Always ask about project goals\n- Extract action items with deadlines\n- Suggest next steps\n- Track and remind about upcoming deadlines")]
```

#### Searching and Connecting with Context
```
User: "What notes do I have about habit formation?"

Agent: I found several notes related to habit formation...
[Searches across all notes, returns relevant results with context from agent instructions]

User: "Find all notes that mention dates in YYYY-MM-DD format"

Agent: I'll search using a regex pattern to find date mentions.
[Searches with regex pattern \d{4}-\d{2}-\d{2} across all notes]

User: "Link my Atomic Habits note to my other productivity notes"

Agent: I'll create connections between your habit and productivity notes. Based on your reading note guidelines, I should also suggest rating these books relative to each other.
[Creates links and follows agent instructions to suggest comparative analysis]

User: "Create a meeting note for tomorrow's team standup"

Agent: I'll create a meeting note for your standup. Based on your meeting note settings, I'll include sections for attendees, decisions, and action items.
[Creates note following agent instructions: "Extract attendees and decisions", "Track action items", "Identify follow-ups"]
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
- [x] Successfully create and manage note types through MCP
- [x] Agent instruction management and contextual guidance
- [x] Seamless integration with at least one MCP client
- [x] Basic search and retrieval functionality
- [x] File system remains clean and portable

### Long-term Success Indicators
- User retention and daily active usage
- Quality of agent suggestions and automations
- Speed and accuracy of search functionality
- Community adoption and contribution

---

*This design document is a living document and will evolve as the project develops.*