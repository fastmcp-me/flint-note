# jade-note Presentation Script

## Opening Hook (2 minutes)
**"What if your notes could think?"**

*Start with a live demo - open Claude Desktop with jade-note MCP server running*

"Today I'm going to show you jade-note - not just another note-taking app, but an **agent-first** knowledge management system. Instead of fighting with your tools to organize information, your notes become intelligent participants in your workflow."

*Show the config file briefly*
"Here's what makes jade-note different - it's built from the ground up as an MCP server, meaning any AI agent can read, write, and reason about your notes with full context."

---

## Demo 1: Basic Note Creation with Intelligence (5 minutes)

### Setting Up Note Types
"Let's start by creating some note types. In jade-note, every note type has its own personality through agent instructions."

**Live Demo:**
```bash
# Show existing note types structure
ls -la .jade-note/
cat .jade-note/config.yml
```

*Navigate to existing note types*
"I already have some note types set up - let's look at the movie type:"

```markdown
# Movie Notes
## Agent Instructions
- Ask clarifying questions about plot, characters, themes
- Suggest rating scale and categorization
- Connect to similar movies in the database
- Extract key themes and memorable quotes
```

**Create a new note type - "daily":**
*Use Claude to create a daily note type with agent instructions for:*
- Summarizing the day's accomplishments
- Extracting action items for tomorrow
- Linking to related projects and goals
- Mood tracking and reflection prompts

---

## Demo 2: MCP Integration Power (8 minutes)

### Mixing Multiple MCP Servers
"Here's where jade-note gets really powerful - it plays nicely with other MCP servers."

**Setup:**
*Show Claude Desktop config with multiple MCP servers:*
- jade-note (our notes)
- web search MCP server
- filesystem MCP server

**Live Demo - Research Note Creation:**
1. **Web Search Integration:**
   ```
   "Help me create a research note about sustainable architecture trends in 2024. 
   Use web search to find current information and save it as a 'research' note type."
   ```

2. **Show the magic:**
   - Claude searches the web for current information
   - Automatically structures it using jade-note's research note template
   - Creates proper metadata and tags
   - Links to related notes in the system

3. **File System Integration:**
   ```
   "Now help me create a daily log note that summarizes my recent git commits 
   and connects them to my project goals."
   ```
   - Claude reads recent commits from filesystem
   - References existing project notes in jade-note
   - Creates connections and tracks progress

---

## Demo 3: Note Type Showcase (10 minutes)

### Todo Notes
"Let's see how different note types work with their specialized agent instructions."

**Create a todo note:**
```
"Create a todo note for planning my weekend coding project"
```

*Show how the agent:*
- Breaks down tasks into actionable items
- Estimates time requirements
- Links to related project notes
- Sets priority levels
- Creates dependencies

### Reading Notes
**Add a book to reading notes:**
```
"Help me create a reading note for 'The Pragmatic Programmer' - 
I'm halfway through chapter 5"
```

*Demonstrate:*
- Automatic metadata extraction (ISBN, author, publication date)
- Chapter-by-chapter progress tracking
- Key insight extraction
- Connection to coding projects
- Reading goal tracking

### Games Notes
**Gaming session tracking:**
```
"Create a game note for my recent Baldur's Gate 3 playthrough"
```

*Show:*
- Character build documentation
- Story decision tracking
- Screenshot organization
- Playtime logging
- Achievement progress

### Goals & Projects Integration
**Connect everything together:**
```
"Show me how my reading notes connect to my coding projects and goals"
```

*Demonstrate the linking system:*
- Cross-references between note types
- Goal progress tracking
- Project milestone connections
- Learning path visualization

---

## Demo 4: Advanced Features (8 minutes)

### Intelligent Linking
"jade-note doesn't just store notes - it understands relationships."

**Show automatic linking:**
1. Create a project note about "Building a React Dashboard"
2. Reference it in a daily log
3. Connect it to reading notes about React patterns
4. Link to todo items for the project

**Demonstrate bidirectional links:**
- Show how the system maintains relationship consistency
- Automatic backlink generation
- Orphaned note detection

### Metadata Validation
**Custom schemas per note type:**
```yaml
# Movie note schema
metadata_schema:
  rating:
    type: number
    range: [1, 10]
    required: true
  genre:
    type: array
    items: string
    required: true
  watched_date:
    type: date
    required: false
```

*Show validation in action:*
- Try to create invalid metadata
- See helpful error messages
- Demonstrate auto-completion suggestions

### Search and Discovery
**Intelligent search across all notes:**
```
"Find all notes related to 'productivity' that mention 'habits' 
and show me the connections"
```

*Demonstrate:*
- Full-text search with context
- Metadata-based filtering
- Relationship traversal
- Tag-based organization

---

## Demo 5: Real-World Workflow (7 minutes)

### Daily Workflow Integration
"Let me show you how I actually use jade-note in my daily workflow."

**Morning Routine:**
1. **Daily Planning:**
   ```
   "Create today's daily note and help me plan based on yesterday's log 
   and my current project status"
   ```

2. **Show the agent:**
   - Reviews yesterday's accomplishments
   - Identifies unfinished tasks
   - Suggests priorities based on project deadlines
   - Creates time-blocked schedule

**During Work:**
3. **Meeting Notes:**
   ```
   "Help me create a meeting note for our sprint planning session"
   ```
   - Automatic attendee tracking
   - Action item extraction
   - Decision documentation
   - Follow-up task creation

**Evening Review:**
4. **Reflection and Logging:**
   ```
   "Help me wrap up today's work and create tomorrow's preparation"
   ```
   - Progress assessment
   - Learning documentation
   - Goal tracking updates
   - Tomorrow's task preparation

### Code Integration Example
**Show Claude Desktop usage:**
*Switch to Claude Desktop interface*

"Here's how I use jade-note directly in Claude for development work:"

```
"Look at my recent commits and help me update my daily log with what I accomplished. 
Also check if any of this work completes items from my current project goals."
```

*Show the AI:*
- Reading commit messages from filesystem
- Updating daily log in jade-note
- Cross-referencing with project notes
- Updating goal progress
- Suggesting next steps

---

## Demo 6: Extensibility and Customization (5 minutes)

### Custom Agent Instructions
"Every note type can have its own personality and behavior."

**Show different instruction sets:**

**Academic Notes:**
```markdown
Agent Instructions:
- Use academic citation formats
- Suggest related papers and sources
- Identify research gaps and questions
- Connect to ongoing research projects
- Maintain bibliography consistency
```

**Health Tracking:**
```markdown
Agent Instructions:
- Track symptoms and patterns
- Suggest correlations with lifestyle factors
- Remind about medication schedules
- Connect to fitness and nutrition goals
- Maintain privacy and sensitivity
```

### Template System
**Show templating in action:**
```
"Create a new project note using the standard template"
```

*Demonstrate:*
- Dynamic template population
- Conditional sections
- Metadata inheritance
- Cross-reference automation

---

## Technical Deep Dive (3 minutes)

### MCP Architecture Benefits
"Why MCP matters for note-taking:"

1. **Universal Agent Access:** Any MCP-compatible AI can work with your notes
2. **Composability:** Mix and match with other MCP servers
3. **Future-Proof:** As AI capabilities grow, your notes get smarter
4. **Privacy:** Your data stays local while getting AI superpowers

### Performance and Scalability
**Show the technical specs:**
- File-based storage (Git-friendly)
- Fast search indexing
- Metadata validation
- Type safety with TypeScript
- Extensible plugin architecture

---

## Closing and Q&A (5 minutes)

### Key Takeaways
"jade-note transforms note-taking from a passive storage system into an active thinking partner:"

1. **Agent-First Design:** Your notes understand context and relationships
2. **MCP Integration:** Works with any AI system that supports MCP
3. **Flexible Structure:** Custom note types with intelligent behaviors
4. **Real Workflows:** Built for how you actually work, not idealized processes
5. **Future-Ready:** Grows with AI capabilities while keeping your data yours

### What's Next
"This is just the beginning. With MCP as the foundation, jade-note can integrate with:"
- Calendar systems for meeting notes
- Email clients for message archiving
- Code repositories for development logs
- IoT devices for life tracking
- Financial systems for expense logging

### Questions and Discussion
"What would you want your notes to be intelligent about?"

*Open floor for questions and discussion about:*
- Specific use cases
- Integration possibilities
- Customization needs
- Privacy concerns
- Technical implementation

---

## Demo Notes for Presenter

### Pre-Demo Setup Checklist
- [ ] jade-note MCP server running
- [ ] Claude Desktop configured with multiple MCP servers
- [ ] Sample notes created in various types
- [ ] Web search MCP server configured
- [ ] Git repository with recent commits for demo
- [ ] Backup demo data in case of issues

### Demo Tips
1. **Keep it interactive** - ask audience about their note-taking pain points
2. **Show failures too** - demonstrate error handling and validation
3. **Emphasize the "magic"** - highlight when AI connects disparate information
4. **Real data** - use actual notes and projects, not fake demo data
5. **Speed up slow parts** - have pre-prepared examples for complex demos

### Common Questions to Prepare For
- "How does this compare to Obsidian/Notion/Roam?"
- "What about privacy and data ownership?"
- "Can I migrate my existing notes?"
- "How much does AI cost to run?"
- "What if the AI makes mistakes in my notes?"
- "Can I use this without Claude Desktop?"

### Recovery Strategies
- Have screenshots ready if live demo fails
- Keep a backup set of demo data
- Know how to quickly restart services
- Have alternative demo paths prepared
- Practice the presentation without live coding