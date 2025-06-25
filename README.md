# flint-note

An agent-first note-taking system designed from the ground up for AI collaboration. Instead of adding AI features to traditional notes, flint-note treats AI agents as your primary interface for creating, organizing, and connecting your knowledge.

## What is flint-note?

flint-note is a note-taking system where AI agents understand your note types and help you create structured, consistent content. All your notes are stored as plain markdown files with YAML frontmatter - completely portable and future-proof.

- **Agent-first design** - AI agents understand your note types and guide you through creating structured content
- **Local markdown storage** - Your notes are plain markdown files you own and control forever
- **MCP server architecture** - Connects to any AI client that supports the Model Context Protocol
- **Intelligent note types** - Each note type has its own agent instructions and metadata schema
- **Customizable AI behavior** - Tell agents how to behave for each note type using natural language

## Why use flint-note?

- **Universal AI integration**: Works with Claude Desktop, Continue, and any MCP-compatible AI client
- **AI collaboration that makes sense**: Agents understand the context and purpose of each note type
- **Your data, your control**: Everything stored as portable markdown files on your local machine
- **Structured but flexible**: Define schemas for consistency while keeping the freedom to write naturally
- **Future-proof**: No vendor lock-in, works with any text editor, integrates with version control

## Quick Start

```bash
# Install flint-note
npm install -g flint-note

# Initialize your workspace
flint-note init ~/my-notes

# Start the agent server
flint-note serve

# Now connect your AI client to the MCP server
# Add flint-note to Claude Desktop, Continue, or other MCP clients
```

## Example Agent Conversations

### Agent-Guided Note Creation
```
You: I just finished reading "The Psychology of Money"
Agent: I'll create a reading note for you. Based on your reading note schema, I need:
       - Your rating (1-5 stars)
       - Key insights that stuck with you
       - The author's name

       What would you rate this book?
You: I'd give it a 4/5. Main insight was how behavior matters more than knowledge in investing.
Agent: Perfect! I'm creating your reading note with Morgan Housel as author, 4/5 rating,
       and that key insight. The note will be saved as reading/psychology-of-money.md
```

### Intelligent Note Suggestions
```
You: Create a project note for our website redesign
Agent: I'll set up a project note. Based on your project schema, I should include:
       - Project goals and success criteria
       - Key milestones and deadlines
       - Team members and stakeholders
       - Risk assessment

       What's the main goal for this redesign?
You: Improve user engagement and reduce support tickets by 30%
Agent: Excellent! I'll create projects/website-redesign.md with that goal and template
       sections for milestones, team, and risks. Should I link this to any existing notes?
```

### Smart Metadata and Organization
```
You: Add a meeting note for today's standup
Agent: Creating your meeting note. I see you have a standup template that includes:
       - Attendees
       - What did we accomplish yesterday?
       - What are we working on today?
       - Any blockers?

       Who attended today's standup?
You: The whole team - Sarah, Mike, Alex, and me
Agent: Got it! I'll create meetings/standup-2024-01-15.md with those attendees and
       the standup template. The metadata will automatically tag this as a "standup"
       meeting for easy filtering later.
```

## How Note Types Work

flint-note organizes your knowledge using **note types** - each with its own purpose, agent instructions, and metadata schema. Your workspace looks like this:

```
my-notes/
├── .flint-note/
│   └── config.yml
├── reading/
│   ├── _description.md          # Defines how agents help with reading notes
│   ├── atomic-habits.md
│   └── psychology-of-money.md
├── projects/
│   ├── _description.md          # Defines how agents help with projects
│   ├── website-redesign.md
│   └── mobile-app.md
├── meetings/
│   ├── _description.md          # Defines how agents handle meeting notes
│   └── team-standup-2024-01-15.md
└── daily/
    ├── _description.md          # Defines daily note format and prompts
    └── 2024-01-15.md
```

Each `_description.md` file tells agents how to behave for that note type:

```markdown
# Reading Notes

## Purpose
Track books, articles, and papers with structured insights and ratings.

## Agent Instructions
- Always ask for the author's background and credentials
- Extract key insights and actionable takeaways
- Request a personal rating (1-5 stars) and what made it memorable
- Suggest connections to other readings in the vault
- Encourage specific quotes with page references

## Metadata Schema
- title: Book/article title (required, string)
- author: Author name (required, string)
- rating: Personal rating (required, number, min: 1, max: 5)
- status: Reading progress (required, select: to_read|reading|completed)
- tags: Topic categories (optional, array)
- isbn: ISBN for books (optional, string)
```

### Customizing Agent Behavior

You can modify how agents work with any note type just by talking to them:

```
You: Update my reading notes so agents always ask about the book's publication year
Agent: I'll update your reading note instructions to include asking about publication year.
       [Updates reading/_description.md with the new instruction]

You: Make project notes more focused on deadlines and blockers
Agent: I'll modify your project note instructions to emphasize deadline tracking
       and proactive blocker identification.
       [Updates projects/_description.md accordingly]
```

## MCP Server Integration

flint-note runs as a **Model Context Protocol (MCP) server**, which means it can connect to any AI client that supports MCP. This gives you flexibility to use your preferred AI interface while keeping your notes local.

### How It Works

1. **flint-note server** runs locally on your machine, managing your markdown files
2. **AI clients** (like Claude Desktop) connect to the server via MCP
3. **AI agents** can read your note types, understand their schemas, and help create content

### Supported AI Clients

- **Claude Desktop** - Anthropic's official desktop app with MCP support
- **Continue** - VS Code extension for AI-powered development
- **Any [MCP-compatible client](https://github.com/punkpeye/awesome-mcp-clients)** - The protocol is open and growing

### Configuration Example (Claude Desktop)

Add flint-note to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "flint-note": {
      "command": "flint-note",
      "args": ["serve"],
      "env": {}
    }
  }
}
```

Now Claude can help you create notes, understand your note types, and follow your custom agent instructions - all while your data stays completely under your control.

## Getting Started

1. **Install flint-note** and initialize your workspace with default note types
2. **Configure your AI client** to connect to the flint-note MCP server
3. **Start creating notes** by talking to the AI - it understands your note types and schemas
4. **Customize agent instructions** by simply asking the AI to modify how it helps with different note types

The AI agents work through the MCP connection, so you get intelligent note assistance while keeping complete control over your local markdown files.

## Documentation

- [Design Document](./design.md) - Architecture and technical details
- [Configuration Guide](./docs/configuration.md) - Customizing your setup
- [Note Types Reference](./docs/note-types.md) - Available note types and schemas
- [Agent Instructions](./docs/agent-instructions.md) - Customizing AI behavior

## Installation

```bash
npm install -g flint-note
```

## License

MIT
