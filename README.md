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

## Multi-Vault System

jade-note supports multiple vaults, allowing you to organize different collections of notes separately. Each vault is an independent workspace with its own note types, configuration, and notes. This is perfect for separating personal notes, work projects, research topics, or any other organizational structure you prefer.

### Key Features

- **Platform-specific storage**: Configuration stored in appropriate system directories (`~/.config/jade-note` on Unix, `%APPDATA%\jade-note` on Windows)
- **Easy switching**: Switch between vaults instantly without restarting the server
- **Independent workspaces**: Each vault has its own note types, templates, and configuration
- **Legacy support**: Automatically migrates existing workspaces to the vault system

### Vault Management

You can manage vaults through both the MCP server tools and the command-line interface:

#### MCP Tools
- `list_vaults` - List all configured vaults
- `create_vault` - Create a new vault
- `switch_vault` - Switch to a different vault
- `get_current_vault` - Show current vault information
- `update_vault` - Update vault name or description
- `remove_vault` - Remove vault from registry (files preserved)

#### Command Line Interface
```bash
# List all vaults
jade-note list

# Create a new vault
jade-note create work "Work Notes" ~/work-vault

# Switch to a vault
jade-note switch work

# Initialize current directory as a vault
jade-note init --id=project --name="Project Notes"

# Show current vault
jade-note current

# Update vault information
jade-note update work --name "Work & Research"

# Remove a vault (files not deleted)
jade-note remove work
```

### Getting Started with Vaults

1. **First time setup**: When you first run jade-note, it will check for existing workspaces and offer to migrate them
2. **Create your first vault**: Use `create_vault` tool or `jade-note create` command
3. **Switch between vaults**: Use `switch_vault` tool or `jade-note switch` command
4. **Organize by purpose**: Create separate vaults for work, personal, research, projects, etc.

### System Prompts and Multi-Vault Context

When working with multi-vault systems, jade-note automatically provides context to AI agents about the current vault and its purpose. This enables intelligent, vault-aware assistance:

- **Current Vault Context**: All MCP tool responses include information about which vault is currently active
- **Vault-Specific Behavior**: Agents understand the purpose and context of each vault (work, personal, research, etc.)
- **Cross-Vault Awareness**: When switching vaults, agents maintain awareness of the transition and can help organize content appropriately
- **Contextual Suggestions**: Note creation and management suggestions are tailored to the current vault's purpose and existing content

## Agent Instructions System

The agent instructions system is a core feature that enables users to define specific behaviors and guidance for AI agents when working with different note types. This creates a personalized, context-aware experience where agents understand the purpose and conventions of each note category.

### How Agent Instructions Work

1. **Per-Note-Type Guidance**: Each note type can have its own set of agent instructions
2. **Automatic Context**: When agents work with notes, they automatically receive relevant instructions
3. **User-Customizable**: Instructions can be easily updated using natural language through the MCP interface
4. **Contextual Responses**: Note creation responses include agent instructions and helpful suggestions
5. **Vault-Aware Context**: Agent instructions automatically include current vault information and context
6. **Cross-Vault Intelligence**: When switching vaults, agents understand the transition and adapt their behavior accordingly

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
| **Vault Management** | | |
| `list_vaults` | List all configured vaults | none |
| `create_vault` | Create a new vault | `vault_id`, `name`, `path`, `description?` |
| `switch_vault` | Switch to a different vault | `vault_id` |
| `get_current_vault` | Show current vault information | none |
| `update_vault` | Update vault name or description | `vault_id`, `name?`, `description?` |
| `remove_vault` | Remove vault from registry (files preserved) | `vault_id` |
| **Note Management** | | |
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
| `jade-note://vaults` | All configured vaults | JSON list of vault configurations |
| `jade-note://current-vault` | Current active vault information | JSON with vault details and stats |
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
- [x] Vault initialization with default note types (daily, reading, todos, projects, goals, games, movies)

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

## Vault Initialization

When jade-note initializes a new vault, it automatically creates several default note types to provide a comprehensive foundation for knowledge management. These pre-configured note types come with optimized agent instructions, templates, and metadata schemas.

### Default Note Types

#### Daily Notes
**Purpose**: Track daily events, reflections, and activities  
**Directory**: `daily/`  
**Template**:
```markdown
# {{date}}

## Today's Events


## Reflections


## Tomorrow's Focus

```
**Agent Instructions**:
- Ask about key events and accomplishments from the day
- Encourage reflection on lessons learned or insights gained
- Help identify priorities for the next day
- Suggest connections to previous daily entries when relevant

**Metadata Schema**:
- `date`: Date of entry (required, date, format: YYYY-MM-DD)
- `mood`: Daily mood rating (optional, select, options: ["excellent", "good", "neutral", "challenging", "difficult"])
- `energy_level`: Energy level (optional, number, min: 1, max: 10)
- `tags`: Topics or themes (optional, array)

#### Reading Notes
**Purpose**: Track articles, papers, books, and other reading material  
**Directory**: `reading/`  
**Template**:
```markdown
# {{title}}

**Author**: {{author}}  
**Type**: {{type}}  
**Status**: {{status}}

## Summary


## Key Insights


## Personal Rating: {{rating}}/5

## Notes

```
**Agent Instructions**:
- Always ask for author information and publication context
- Extract and organize key insights and takeaways
- Request a personal rating and ask what made it memorable
- Suggest connections to other readings or note types
- Encourage noting specific quotes with page/section references

**Metadata Schema**:
- `title`: Title of the material (required, string)
- `author`: Author or creator (required, string)
- `type`: Type of reading (required, select, options: ["book", "article", "paper", "blog_post", "documentation"])
- `status`: Reading status (required, select, options: ["to_read", "reading", "completed", "abandoned"])
- `rating`: Personal rating (required, number, min: 1, max: 5)
- `tags`: Categories or topics (optional, array)
- `isbn`: ISBN for books (optional, string)
- `url`: Web link for online content (optional, string)
- `published_date`: Publication date (optional, date)

#### Todo Lists
**Purpose**: Track tasks, action items, and things that need to be done  
**Directory**: `todos/`  
**Template**:
```markdown
# {{title}}

**Priority**: {{priority}}  
**Due Date**: {{due_date}}  
**Status**: {{status}}

## Description


## Action Items

- [ ] 

## Notes

```
**Agent Instructions**:
- Help break down large tasks into smaller, actionable items
- Ask about priorities and deadlines
- Suggest realistic timeframes and dependencies
- Encourage regular status updates and progress tracking
- Connect related todos and identify recurring patterns

**Metadata Schema**:
- `title`: Task or todo list name (required, string)
- `priority`: Priority level (required, select, options: ["low", "medium", "high", "urgent"])
- `status`: Current status (required, select, options: ["not_started", "in_progress", "completed", "on_hold", "cancelled"])
- `due_date`: Target completion date (optional, date)
- `tags`: Categories or contexts (optional, array)
- `estimated_time`: Time estimate in minutes (optional, number, min: 1)

#### Project Tracking
**Purpose**: Track ongoing projects, goals, and long-term initiatives  
**Directory**: `projects/`  
**Template**:
```markdown
# {{title}}

**Status**: {{status}}  
**Priority**: {{priority}}  
**Start Date**: {{start_date}}  
**Target Date**: {{target_date}}

## Project Goals


## Current Status


## Action Items

- [ ] 

## Resources & Links


## Notes

```
**Agent Instructions**:
- Ask about project scope, goals, and success criteria
- Help identify key milestones and deadlines
- Encourage breaking projects into manageable phases
- Suggest resource gathering and stakeholder identification
- Track progress and help identify blockers or risks

**Metadata Schema**:
- `title`: Project name (required, string)
- `status`: Current status (required, select, options: ["planning", "active", "on_hold", "completed", "cancelled"])
- `priority`: Priority level (optional, select, options: ["low", "medium", "high"])
- `start_date`: Project start date (optional, date)
- `target_date`: Target completion date (optional, date)
- `team_members`: People involved (optional, array)
- `tags`: Project categories or skills (optional, array)

#### Goals Tracking
**Purpose**: Track long-term personal and professional goals  
**Directory**: `goals/`  
**Template**:
```markdown
# {{title}}

**Category**: {{category}}  
**Timeline**: {{timeline}}  
**Status**: {{status}}

## Goal Description


## Why This Matters


## Success Criteria


## Action Plan


## Progress Updates

```
**Agent Instructions**:
- Help define specific, measurable, achievable goals
- Ask about motivation and personal significance
- Encourage breaking goals into smaller milestones
- Suggest regular check-ins and progress reviews
- Help identify potential obstacles and mitigation strategies
- Connect goals to daily actions and habits

**Metadata Schema**:
- `title`: Goal name (required, string)
- `category`: Goal category (required, select, options: ["personal", "professional", "health", "financial", "learning", "relationships"])
- `timeline`: Target timeframe (required, select, options: ["short_term", "medium_term", "long_term"])
- `status`: Current status (required, select, options: ["not_started", "in_progress", "achieved", "on_hold", "abandoned"])
- `target_date`: Target achievement date (optional, date)
- `progress`: Progress percentage (optional, number, min: 0, max: 100)
- `tags`: Related themes or skills (optional, array)

#### Games Tracking
**Purpose**: Track video games played, progress, and experiences  
**Directory**: `games/`  
**Template**:
```markdown
# {{title}}

**Platform**: {{platform}}  
**Genre**: {{genre}}  
**Status**: {{status}}  
**Rating**: {{rating}}/5

## Game Info


## My Experience


## Highlights & Memorable Moments


## Final Thoughts

```
**Agent Instructions**:
- Ask about platform, genre, and gameplay style preferences
- Encourage documenting memorable moments and achievements
- Help track completion status and playtime
- Suggest connections to similar games or genres
- Ask about what made the experience unique or noteworthy

**Metadata Schema**:
- `title`: Game title (required, string)
- `platform`: Gaming platform (required, select, options: ["PC", "PlayStation", "Xbox", "Nintendo_Switch", "Mobile", "Other"])
- `genre`: Game genre (optional, array, suggestions: ["RPG", "Action", "Strategy", "Puzzle", "Adventure", "Simulation", "Sports"])
- `status`: Play status (required, select, options: ["wishlist", "playing", "completed", "dropped", "on_hold"])
- `rating`: Personal rating (optional, number, min: 1, max: 5)
- `playtime_hours`: Hours played (optional, number, min: 0)
- `tags`: Themes or characteristics (optional, array)
- `release_year`: Year released (optional, number)

#### Movies Tracking
**Purpose**: Track movies watched, reviews, and recommendations  
**Directory**: `movies/`  
**Template**:
```markdown
# {{title}}

**Director**: {{director}}  
**Year**: {{year}}  
**Genre**: {{genre}}  
**Rating**: {{rating}}/5

## Plot Summary


## My Thoughts


## Memorable Scenes


## Would I Recommend?

```
**Agent Instructions**:
- Ask about what drew them to watch this particular movie
- Encourage discussing themes, cinematography, and performances
- Help identify what made the movie memorable or forgettable
- Suggest similar movies or directors they might enjoy
- Ask about emotional impact and lasting impressions

**Metadata Schema**:
- `title`: Movie title (required, string)
- `director`: Director name (optional, string)
- `year`: Release year (optional, number, min: 1900, max: 2030)
- `genre`: Movie genre (optional, array, suggestions: ["Drama", "Comedy", "Action", "Thriller", "Horror", "Romance", "Sci-Fi", "Documentary"])
- `rating`: Personal rating (required, number, min: 1, max: 5)
- `watched_date`: Date watched (optional, date)
- `runtime_minutes`: Movie length in minutes (optional, number, min: 1)
- `tags`: Themes or characteristics (optional, array)

### Vault Initialization Process

1. **Create vault structure**: Initialize `.jade-note/` directory with configuration
2. **Generate default config**: Create `config.yml` with optimal defaults
3. **Create note type directories**: Set up folders for all default note types
4. **Generate description files**: Create `_description.md` for each note type with templates, instructions, and schemas
5. **Create welcome note**: Generate an introductory note explaining the vault structure and how to get started

The initialization ensures users have a rich, immediately usable knowledge management system while maintaining full flexibility to customize or add additional note types.

## Technical Specifications

### Dependencies
- **Runtime**: Node.js 18+
- **MCP SDK**: @modelcontextprotocol/sdk
- **File Operations**: Node.js fs/promises
- **Search**: Simple text search with regex support, with plans for vector search
- **Configuration**: YAML parsing (js-yaml)

### Configuration Schema

#### Global Configuration (~/.jade-note/config.yml)
```yaml
# Global vault registry
vaults:
  work:
    name: "Work Notes"
    path: "~/work-notes"
    description: "Professional projects and meeting notes"
    last_used: "2024-01-15T10:30:00Z"
  personal:
    name: "Personal Journal"
    path: "~/personal-notes"
    description: "Personal thoughts, goals, and interests"
    last_used: "2024-01-14T20:15:00Z"

current_vault: "work"  # Currently active vault

mcp_server:
  port: 3000
  log_level: "info"
  auto_switch_vault: true  # Switch vault context based on MCP client requests
```

#### Per-Vault Configuration (.jade-note/config.yml in each vault)
```yaml
# Individual vault configuration
vault_id: "work"
workspace_root: "."
default_note_type: "general"
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

#### Managing Multiple Vaults
```
User: "I want to set up separate vaults for work and personal notes"

Agent: I'll help you create and manage multiple vaults for better organization.

[Uses create_vault tool]
Created vault "work" at ~/work-notes with description "Professional projects and meeting notes"
Created vault "personal" at ~/personal-notes with description "Personal thoughts, goals, and interests"

You now have two vaults configured:
- **work**: For professional content (currently active)
- **personal**: For personal content

You can switch between them anytime using the switch_vault tool or by asking me to switch contexts.

User: "Switch to my personal vault and create a reading note"

Agent: Switching to your personal vault now.
[Uses switch_vault tool with vault_id="personal"]

Now in personal vault. I'll create a reading note for you - what book are you reading?
[Creates note using personal vault's reading note type and templates]
```

```
User: "Show me all my vaults and their current status"

Agent: [Uses list_vaults tool]

Here are your configured vaults:
- **work** (~/work-notes): Professional projects and meeting notes
  - 45 notes, last used yesterday
- **personal** (~/personal-notes): Personal thoughts, goals, and interests  
  - 23 notes, currently active
- **research** (~/research): Academic research and paper notes
  - 12 notes, last used last week

Currently active: **personal**

Would you like to switch to a different vault or create a new one?
```

#### Initializing a New Vault
```
User: "Set up a new jade-note vault in my documents folder"

Agent: I'll initialize a new jade-note vault for you with all the default note types.
[Creates .jade-note directory structure, config.yml, and default note types]

Vault initialized successfully! I've created the following note types for you:
- **daily**: For tracking daily events and reflections
- **reading**: For books, articles, and papers you read
- **todos**: For tasks and action items
- **projects**: For ongoing projects and initiatives
- **goals**: For long-term personal and professional goals
- **games**: For video games you play
- **movies**: For movies you watch

Each note type comes with optimized templates, agent instructions, and metadata schemas. You can start creating notes right away or customize any of these note types to better fit your needs.

User: "Create my first daily note for today"

Agent: I'll create today's daily note for you. What were the key events from your day?
[Creates daily note using the pre-configured template and agent instructions]
```

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
