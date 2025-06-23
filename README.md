# jade-note Design Document

## Overview

**jade-note** is an agent-first note-taking application designed to help users maintain and interact with their personal knowledge base through natural language interfaces. Unlike traditional note-taking apps that add AI features as an afterthought, jade-note is architected from the ground up to be agent-native.

> 🤖 **AI Integration**: Ready-to-use prompts for all AI models are available in the [`prompts/`](./prompts/) directory. See [`prompts/README.md`](./prompts/README.md) for setup instructions.

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

## Metadata Schema System

The metadata schema system provides structured data validation and type safety for note frontmatter, enabling consistent data collection and intelligent agent interactions.

### How Metadata Schemas Work

1. **Type-Specific Schemas**: Each note type can define its own metadata schema with field definitions
2. **Automatic Validation**: Metadata is validated against the schema when creating or updating notes
3. **Rich Field Types**: Support for strings, numbers, booleans, dates, arrays, and select fields
4. **Constraint Validation**: Enforce min/max values, string patterns, and selection options
5. **Default Values**: Automatic generation of sensible defaults for required fields

### Supported Field Types

- **string**: Text fields with optional pattern validation
- **number**: Numeric fields with min/max constraints
- **boolean**: True/false fields
- **date**: ISO date strings with automatic validation
- **array**: Lists of values with optional length constraints
- **select**: Single choice from predefined options

### Schema Definition Format

Metadata schemas are defined in the note type's `_description.md` file:

```markdown
## Metadata Schema
Expected frontmatter or metadata fields for this note type:
- title: Book title (required, string)
- author: Author name (required, string)
- rating: Personal rating (required, number, min: 1, max: 5)
- genre: Book genre (optional, string)
- isbn: ISBN number (optional, string, pattern: "^[0-9-]{10,17}$")
- status: Reading status (optional, select, options: ["to-read", "reading", "completed"])
- tags: Topic tags (optional, array)
- finished_date: Date completed (optional, date)
```

### Validation and Error Handling

- **Required Field Validation**: Ensures all required fields are present
- **Type Validation**: Verifies field values match expected types
- **Constraint Validation**: Enforces min/max, patterns, and selection options
- **Unknown Field Warnings**: Warns about fields not defined in schema
- **Helpful Error Messages**: Clear feedback when validation fails

### Benefits

- **Data Consistency**: Ensures all notes of a type have consistent metadata structure
- **Agent Intelligence**: Agents can reliably access and process structured metadata
- **User Guidance**: Clear expectations for what metadata should be provided
- **Validation Feedback**: Immediate feedback prevents invalid data entry
- **Schema Evolution**: Easy to update schemas as requirements change

## Architecture

### File System Structure

```
jade-note-workspace/
├── .jade-note/
│   ├── config.yml              # Global configuration
│   ├── search-index.json       # Search index cache
│   └── mcp-server.log         # MCP server logs
├── {note-type-1}/
│   ├── _description.md        # Type definition, agent instructions, and metadata schema
│   ├── _template.md          # Optional default template
│   ├── note-1.md
│   └── note-2.md
├── {note-type-2}/
│   ├── _description.md
│   └── another-note.md
└── general/                   # Default note type
    ├── _description.md
    └── misc-thoughts.md
```

### Note Type Definition

Each note type directory contains a `_description.md` file that defines:

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

## Metadata Schema
Expected frontmatter or metadata fields for this note type:
- title: Note title (required, string)
- author: Author name (optional, string)
- rating: Personal rating (optional, number, min: 1, max: 5)
- status: Current status (optional, select, options: ["draft", "published", "archived"])
- tags: Relevant tags (optional, array)
- isbn: ISBN number (optional, string, pattern: "^[0-9-]{10,17}$")
- published_date: Publication date (optional, date)
```

### Note File Structure with Metadata

Individual notes are stored as Markdown files with YAML frontmatter containing structured metadata:

```markdown
---
title: "Atomic Habits"
author: "James Clear"
rating: 5
status: "completed"
tags: ["productivity", "habits", "self-improvement"]
isbn: "978-0735211292"
published_date: "2024-01-15T00:00:00Z"
type: "book-reviews"
created: "2024-01-15T10:30:00Z"
updated: "2024-01-15T10:30:00Z"
---

# Atomic Habits

## Summary
Excellent book about building good habits and breaking bad ones...

## Key Insights
- Small changes compound over time
- Focus on systems, not goals
- Environment design is crucial

## My Rating: 5/5
Would definitely recommend to anyone interested in personal development.
```

### MCP Server Interface

The jade-note MCP server exposes the following tools and resources:

#### Tools

| Tool Name | Purpose | Parameters |
|:----------|:--------|:-----------|
| `create_note_type` | Create new note type with description | `type_name`, `description`, `template?`, `agent_instructions?`, `metadata_schema?` |
| `create_note` | Create new note of specified type | `type`, `title`, `content`, `use_template?`, `metadata?` |
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
- [x] Note type system with `_description.md`
- [x] Basic MCP server with CRUD operations
- [x] Simple search functionality
- [x] Integration with MCP-compatible clients
- [x] Template-based note creation with variable substitution
- [x] Agent instruction management and integration
- [x] Note type field updates (instructions, description, template, metadata)
- [x] Structured metadata schema system with validation
- [x] Rich field types (string, number, boolean, date, array, select)
- [x] Constraint validation and error handling

### Phase 2: Agent Intelligence
- [x] Agent instructions integration with note creation
- [x] Contextual agent guidance based on note types
- [x] Metadata-driven agent behavior and validation
- [x] Schema-based field suggestions and defaults
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
metadata:
  validate_on_create: true
  validate_on_update: true
  strict_validation: false  # If true, unknown fields cause errors instead of warnings
```

### Error Handling
- Graceful handling of missing directories
- Validation of note type names (filesystem-safe)
- Concurrent file access protection
- MCP protocol error responses
- Regex validation and error handling for malformed patterns
- Metadata schema validation with detailed error messages
- Type coercion and constraint validation
- Unknown field warnings vs. errors based on configuration

### Security Considerations
- Restrict file operations to workspace directory
- Validate all file paths to prevent directory traversal
- No execution of user-provided code
- Read-only access to system files
- Sanitize metadata field names and values
- Validate regex patterns in metadata constraints
- Prevent schema injection attacks through field definitions

## User Experience

### Typical Workflows

#### Creating a New Note Type
```
User: "I want to create a note type for tracking my reading notes"

Agent: I'll create a new note type for reading notes.
[Creates directory and _description.md with appropriate template]

User: "Make sure it includes fields for author, key insights, and my rating"

Agent: I'll update the template to include those fields.
[Updates _description.md with enhanced template]
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

Agent: I'll create a new reading note for that book. Based on your reading note schema, I'll need the author name and your rating (1-5 stars). I can see you've provided the author as James Clear - what rating would you give this book?
[Creates note with metadata validation, ensures required fields are provided]

User: "I'd give it 5 stars. The key insight is that small changes compound over time"

Agent: Perfect! I'll create your reading note with a 5-star rating and include that key insight.
[Creates note with validated metadata: {author: "James Clear", rating: 5}, includes agent instructions to ask follow-up questions]
```

#### Creating Notes with Metadata Validation
```
User: "Create a book review for 'Deep Work' - it's by Cal Newport, productivity genre, I'd rate it 4 stars"

Agent: I'll create your book review with the provided metadata. Let me validate this against your book review schema...
[Validates metadata: {title: "Deep Work", author: "Cal Newport", genre: "productivity", rating: 4} - all fields valid]

Created your book review note with structured metadata. Based on your schema, all required fields are provided and the rating is within the valid range (1-5).

User: "Add a book review but I haven't finished it yet"

Agent: I'll create a book review note. Since you haven't finished it, I'll mark the status as "reading" and we can update the rating later when you're done. What's the book title and author?
[Uses schema defaults and handles partial metadata entry]
```

#### Metadata Schema Management
```
User: "Update my book review schema to include a 'recommend' field"

Agent: I'll add a recommendation field to your book review metadata schema.
[Uses update_note_type("book-reviews", "metadata_schema", "...") to add new field]

User: "Make the author field optional in meeting notes"

Agent: I'll update your meeting notes schema to make the author field optional.
[Updates schema definition, changing author from required to optional]

User: "What metadata fields does my project note type expect?"

Agent: Let me check your project note type schema...
[Uses get_note_type_info("projects") to retrieve schema definition]

Your project notes expect these metadata fields:
- title: Project name (required, string)
- status: Current status (required, select: "planning", "active", "completed", "on-hold")
- priority: Priority level (optional, select: "low", "medium", "high")
- due_date: Target completion date (optional, date)
- team_members: Assigned team members (optional, array)
```

#### Error Handling and Validation Feedback
```
User: "Create a book review with rating 10"

Agent: I can't create that note because the rating value exceeds the maximum allowed. Your book review schema requires ratings between 1 and 5 stars. Would you like to use a rating within that range?
[Metadata validation catches constraint violation and provides helpful error message]

User: "Add a meeting note without specifying the meeting type"

Agent: I notice your meeting note schema requires a 'type' field. The valid options are: "standup", "planning", "retrospective", "one-on-one". Which type should I use for this meeting?
[Validation error provides available options for select fields]
```

#### Managing Agent Instructions and Schemas
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

User: "Add a priority field to my project notes schema"

Agent: I'll add a priority field to your project notes metadata schema.
[Uses update_note_type("projects", "metadata_schema", "- priority: Priority level (optional, select, options: [\"low\", \"medium\", \"high\"])")]

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

User: "Show me all book reviews with ratings above 4"

Agent: I'll search your book review notes and filter by the rating metadata field.
[Uses metadata field filtering to find highly-rated books based on structured data]
```

User: "Create a meeting note for tomorrow's team standup"

Agent: I'll create a meeting note for your standup. Based on your meeting note settings, I'll include sections for attendees, decisions, and action items.
[Creates note following agent instructions: "Extract attendees and decisions", "Track action items", "Identify follow-ups"]
```

## Future Considerations

### Scalability
- Implement incremental search indexing for large note collections
- Consider database backend for metadata while keeping notes as files
- Optimize file watching for large directories
- Metadata field indexing for fast filtering and querying
- Schema migration tools for evolving metadata definitions

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
- Metadata-driven content suggestions ("You usually rate books in this genre higher")
- Automatic schema evolution based on usage patterns
- Smart field completion using historical metadata values

### Metadata-Enabled Intelligence
The structured metadata system provides a foundation for advanced AI capabilities:

- **Smart Recommendations**: "Based on your 5-star ratings, you might enjoy books by similar authors"
- **Pattern Recognition**: "You tend to rate productivity books higher than fiction"
- **Data-Driven Insights**: "You've read 12 books this year with an average rating of 4.2"
- **Automated Workflows**: "Create follow-up tasks for all project notes with status 'needs-review'"
- **Quality Metrics**: "Meeting notes with action items have 80% better follow-through"
- **Trend Analysis**: "Your reading pace has increased 40% since adopting the rating system"

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
- Metadata schema adoption and effectiveness
- Reduction in data entry errors through validation
- User satisfaction with structured data features

## Development Roadmap

### Current Status (June 2025)
The project has a comprehensive design document and core implementation with MCP server, note management, and metadata systems. However, several integration tests are failing and need immediate attention.

### Immediate Priorities (Fix Foundation) 🔴

#### **1. Resolve Test Failures**
- **Issue**: Integration tests showing 27+ compilation errors in metadata system
- **Action**: Fix TypeScript compilation issues, imports, and runtime errors
- **Timeline**: 1-2 weeks
- **Success Criteria**: All tests passing, CI/CD pipeline green

#### **2. Verify Core Functionality** 
- **Action**: Manual testing of all MVP features through MCP interface
- **Verify**: Note CRUD operations, note type management, search, metadata validation
- **Timeline**: 1 week
- **Success Criteria**: All core features work reliably

### Short-term Development (Next 2-4 weeks)

#### **3. Complete Phase 1 MVP Features**
- ✅ Basic note creation/reading/updating (implemented)
- ✅ Note type system (implemented) 
- ✅ File-based storage (implemented)
- ✅ MCP server interface (implemented)
- ❓ **Verify** metadata validation works correctly
- ❓ **Verify** search indexing functions properly

#### **4. Improve Documentation with Real Examples**
- Add working copy-paste example commands
- Create troubleshooting guide with actual error messages
- Include screenshots/GIFs of system in action
- Test setup guide with fresh user

#### **5. Add Error Handling & Validation**
- Implement robust error messages for common mistakes
- Add validation for note type schemas  
- Ensure graceful handling of malformed files
- Create user-friendly error reporting

### Medium-term Goals (1-2 months)

#### **6. Agent Instructions System Enhancement**
- Implement dynamic agent instruction loading
- Create template library for common note types (meetings, books, projects)
- Test agent instruction effectiveness with multiple AI assistants
- Add instruction versioning and rollback

#### **7. Search & Discovery Improvements**
- Implement full-text search with relevance ranking
- Add tag-based filtering and faceted search
- Create smart suggestions for note connections
- Optimize search index performance

#### **8. User Experience Polish**
- Add progress feedback for long operations
- Improve error messages with actionable suggestions
- Create guided onboarding flow for new users
- Implement keyboard shortcuts and power-user features

### Long-term Vision (3+ months)

#### **9. Phase 2 & 3 Features**
From the original roadmap:
- Advanced metadata schemas with custom validation rules
- Automatic note linking and relationship detection
- Export/import functionality for portability
- Plugin system for extensibility

#### **10. Community & Adoption**
- Create example workspaces for different use cases
- Build integrations with popular AI tools beyond MCP
- Develop community template and schema library
- Establish contribution guidelines and developer documentation

### Development Priorities by Impact

| Priority | Feature | Impact | Effort | Timeline |
|----------|---------|---------|--------|----------|
| P0 | Fix failing tests | High | Medium | 1-2 weeks |
| P0 | Verify core functionality | High | Low | 1 week |
| P1 | Error handling improvements | High | Medium | 2-3 weeks |
| P1 | Documentation with examples | Medium | Low | 1 week |
| P2 | Agent instructions enhancement | High | High | 1-2 months |
| P2 | Search improvements | Medium | Medium | 3-4 weeks |
| P3 | Advanced metadata features | Medium | High | 2-3 months |

### Quality Gates

Before moving to next phase:
- [ ] All tests passing consistently
- [ ] Manual testing of all MVP features complete
- [ ] Documentation validated by external user
- [ ] Error handling covers common failure modes
- [ ] Performance acceptable for typical use cases (100-1000 notes)

### Risk Mitigation

**Technical Risks:**
- **Test failures blocking development** → Prioritize test fixes above new features
- **Performance degradation** → Implement benchmarking early
- **Complex metadata validation** → Start with simple validation, iterate

**Adoption Risks:**
- **Poor user experience** → Focus on polish and documentation
- **Integration complexity** → Create comprehensive setup guides
- **Learning curve** → Develop onboarding materials and examples

---

*This design document and roadmap are living documents that evolve as the project develops.*
