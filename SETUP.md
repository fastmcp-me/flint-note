# jade-note Setup Guide

## Overview

jade-note is an agent-first note-taking application that uses the Model Context Protocol (MCP) to provide AI agents with direct access to your personal knowledge base. This guide will help you set up and start using jade-note.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- An MCP-compatible chat client (like Claude Desktop, Cody, or custom MCP clients)

## Installation

1. **Clone or download the project:**
   ```bash
   git clone <repository-url>
   cd jade-note
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run tests to verify installation:**
   ```bash
   npm test
   ```

## Quick Start

### 1. Initialize Your Workspace

Create a directory for your notes and navigate to it:

```bash
mkdir my-notes
cd my-notes
```

### 2. Set the Workspace Environment Variable

jade-note uses the `JADE_NOTE_WORKSPACE` environment variable to know where your notes are stored. Set this to point to your notes directory:

**For the current session:**
```bash
export JADE_NOTE_WORKSPACE=/path/to/your/notes-directory
```

**To make it permanent (recommended):**

Add the export command to your shell configuration file:

```bash
# For bash users
echo 'export JADE_NOTE_WORKSPACE=/path/to/your/notes-directory' >> ~/.bashrc
source ~/.bashrc

# For zsh users (macOS default)
echo 'export JADE_NOTE_WORKSPACE=/path/to/your/notes-directory' >> ~/.zshrc
source ~/.zshrc

# For fish users
set -Ux JADE_NOTE_WORKSPACE /path/to/your/notes-directory
```

Replace `/path/to/your/notes-directory` with the absolute path to your notes directory (e.g., `/Users/yourname/my-notes` on macOS or `/home/yourname/my-notes` on Linux).

### 3. Start the MCP Server

From the jade-note directory, start the server:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 4. Configure Your MCP Client

Add jade-note to your MCP client configuration. For Claude Desktop, add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jade-note": {
      "command": "node",
      "args": ["/path/to/jade-note/src/server.js"],
      "env": {
        "JADE_NOTE_WORKSPACE": "/path/to/your/notes-directory"
      }
    }
  }
}
```

**Note:** You can either use the `env` field in the MCP configuration (as shown above) or rely on the environment variable you set in step 2. The `env` field takes precedence and is useful if you want to use different workspaces for different MCP clients.

### 5. Start Taking Notes!

Once connected, you can interact with your notes through natural language:

- "Create a new note type for meeting notes"
- "Add a note about today's project discussion"
- "Search for notes about machine learning"
- "Show me all my recent notes"

## Project Structure

After initialization, your workspace will look like this:

```
my-notes/
├── .jade-note/
│   ├── config.yml              # Configuration
│   ├── search-index.json       # Search index
│   └── mcp-server.log         # Server logs
├── general/                    # Default note type
│   ├── .description.md        # Type definition
│   └── welcome.md             # Sample note
└── [your-note-types]/         # Custom note types
    ├── .description.md
    ├── .template.md           # Optional template
    └── your-notes.md
```

## Configuration

The configuration file (`.jade-note/config.yml`) contains:

```yaml
version: "1.0.0"
workspace_root: "."
default_note_type: "general"
mcp_server:
  name: "jade-note"
  version: "0.1.0"
  port: 3000
  log_level: "info"
  log_file: ".jade-note/mcp-server.log"
search:
  index_enabled: true
  index_path: ".jade-note/search-index.json"
  rebuild_on_startup: false
  max_results: 50
note_types:
  auto_create_directories: true
  require_descriptions: true
  allow_custom_templates: true
```

## Available MCP Tools

jade-note exposes these tools to AI agents:

### Note Management
- `create_note` - Create a new note in a specific type
- `get_note` - Retrieve a note by identifier
- `update_note` - Update an existing note
- `search_notes` - Search notes by content/type

### Note Type Management
- `create_note_type` - Create a new note type with description
- `list_note_types` - List all available note types

### Resources
- `jade-note://types` - Available note types
- `jade-note://recent` - Recently modified notes
- `jade-note://stats` - Workspace statistics

## Usage Examples

### Creating Note Types

```bash
# Through an AI agent:
"Create a note type called 'meetings' for tracking my meeting notes. 
Include fields for attendees, date, and action items."
```

### Adding Notes

```bash
# Through an AI agent:
"Add a meeting note for today's team standup. 
Attendees were Alice, Bob, and Charlie. 
Main topic was the Q4 planning."
```

### Searching Notes

```bash
# Through an AI agent:
"Find all notes about project planning from the last month"
"Search for notes tagged with 'urgent'"
"Show me my recent meeting notes"
```

## Development

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

### Project Structure

```
jade-note/
├── src/
│   ├── server.js              # MCP server entry point
│   ├── core/
│   │   ├── workspace.js       # Workspace management
│   │   ├── notes.js           # Note operations
│   │   ├── note-types.js      # Note type management
│   │   └── search.js          # Search functionality
│   └── utils/
│       └── config.js          # Configuration utilities
├── test/                      # Test files
├── package.json
└── README.md
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Ensure you're using Node.js 18+ with ES modules support
   - Check that all dependencies are installed with `npm install`

2. **MCP connection issues**
   - Verify the server is running with `npm start`
   - Check your MCP client configuration
   - Look for errors in `.jade-note/mcp-server.log`

3. **Permission errors**
   - Ensure the user has write permissions to the workspace directory
   - Check that the `.jade-note` directory can be created

4. **Workspace not found errors**
   - Verify that the `JADE_NOTE_WORKSPACE` environment variable is set correctly
   - Check that the workspace directory exists and is accessible
   - Ensure the path is absolute, not relative

### Logs

Server logs are stored in `.jade-note/mcp-server.log`. Check this file for detailed error information.

## Security Considerations

- jade-note restricts all file operations to within your workspace directory
- No external network access is required
- All data stays on your local machine
- Use version control (git) to backup your notes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the logs in `.jade-note/mcp-server.log`
- Open an issue on the project repository

---

*jade-note: Agent-first note-taking for the modern knowledge worker*