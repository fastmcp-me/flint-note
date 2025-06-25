# flint-note

**NOTE: Experimental! This is very work in progress. Do not trust it yet!**

A Model Context Protocol (MCP) server that provides an agent-first note-taking system designed from the ground up for AI collaboration. Instead of adding AI features to traditional notes, flint-note treats AI agents as your primary interface for creating, organizing, and connecting your knowledge.

## Key features

- **Agent-first design** - AI agents understand your note types and guide you through creating structured content
- **Local markdown storage** - Your notes are plain markdown files you own and control forever
- **MCP server architecture** - Connects to any AI client that supports the Model Context Protocol
- **Intelligent note types** - Each note type has its own agent instructions and metadata schema
- **Customizable AI behavior** - Tell agents how to behave for each note type using natural language

## Pre-requisites

- Node.js 18+
- Any [MCP capable client](https://github.com/punkpeye/awesome-mcp-clients) (e.g., Claude Desktop, Cursor, Raycast, etc.)

### How It Works

1. **flint-note server** runs locally on your machine, managing your markdown files
2. **AI clients** (like Claude Desktop) connect to the server via MCP
3. **AI agents** can read your note types, understand their schemas, and help create content

### Getting Started

Add flint-note to your client's MCP config:

```json
{
  "mcpServers": {
    "flint-note": {
      "command": "npx",
      "args": ["@flint-note/server"],
    }
  }
}
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

## License

MIT
