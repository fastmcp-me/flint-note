# flint-note

An agent-first note-taking system designed from the ground up for AI collaboration. Instead of adding AI features to traditional notes, flint-note treats AI agents as your primary interface for creating, organizing, and connecting your knowledge.

## What is flint-note?

flint-note is a note-taking system where AI agents understand your note types and help you create structured, consistent content. All your notes are stored as plain markdown files with YAML frontmatter - completely portable and future-proof.

- **Agent-first design** - AI agents understand your note types and guide you through creating structured content
- **Local markdown storage** - Your notes are plain markdown files you own and control forever
- **Intelligent note types** - Define custom schemas and agent instructions for different kinds of notes
- **Natural language interface** - Talk to AI about your notes instead of clicking through menus

## Why use flint-note?

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

# Now talk to AI agents through any MCP-compatible client
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

## Getting Started

1. **Install flint-note** and initialize your workspace with default note types
2. **Start the MCP server** to enable AI agent communication
3. **Connect your AI client** (Claude Desktop, etc.) to the flint-note server
4. **Create your first note** by talking to the AI - it understands your note types and schemas

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