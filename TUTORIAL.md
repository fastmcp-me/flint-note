# jade-note Tutorial: Your Agent-First Note-Taking System

Welcome to jade-note! This tutorial will guide you through using jade-note, an innovative note-taking application designed from the ground up to work seamlessly with AI agents. Unlike traditional note apps that bolt on AI features, jade-note is built to be controlled entirely through natural language conversations with AI assistants.

## What Makes jade-note Different?

jade-note flips the script on note-taking:
- **Agent-First**: Talk to your AI assistant to manage notes, don't click through menus
- **Semantic Organization**: Your note types have meaning that AI agents understand
- **File-Based**: All your notes are stored as simple Markdown files you own
- **Extensible**: Easy to create new note types with custom behaviors
- **Portable**: Works with any MCP-compatible AI client, no vendor lock-in

## Getting Started

### Prerequisites

Before you begin, make sure you have:
- Node.js 18.0.0 or higher installed
- An MCP-compatible AI client (like Claude Desktop, Cody, or Cursor)
- Basic familiarity with AI chat interfaces

### Installation

1. **Get jade-note:**
   ```bash
   git clone <repository-url>
   cd jade-note
   npm install
   ```

2. **Set up your notes workspace:**
   ```bash
   mkdir ~/my-knowledge-base
   cd ~/my-knowledge-base
   ```

3. **Configure your AI client:**
   
   For **Claude Desktop**, add this to your `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "jade-note": {
         "command": "node",
         "args": ["/path/to/jade-note/src/server.ts"],
         "cwd": "/Users/yourname/my-knowledge-base"
       }
     }
   }
   ```

4. **Start jade-note:**
   ```bash
   # In the jade-note directory
   npm start
   ```

5. **Open your AI client** and you're ready to go!

## Core Concepts

### Note Types: The Heart of jade-note

Traditional note apps organize by folders or tags. jade-note organizes by **note types** - categories that carry semantic meaning. Each note type defines:

- **Purpose**: What kind of information belongs here
- **Agent Instructions**: How AI should behave with these notes
- **Templates**: Default structure for new notes
- **Behaviors**: Special actions (like extracting action items)

### Your First Conversation

Once connected, start chatting with your AI assistant:

**You:** "What note types are available?"

**AI:** "You currently have one note type:
- **general**: For miscellaneous thoughts and information

Would you like me to create some specialized note types for you?"

**You:** "Yes, create a note type for meeting notes"

**AI:** "I'll create a 'meetings' note type for you with fields for attendees, agenda, and action items."

## Practical Workflows

### Workflow 1: Meeting Notes Management

Let's walk through managing meeting notes from start to finish.

**Creating the Note Type:**

**You:** "Create a note type for meeting notes. It should include attendees, date, main topics discussed, decisions made, and action items with owners."

**AI:** "I've created a 'meetings' note type with a template that includes:
- Meeting date and attendees
- Agenda/topics discussed  
- Key decisions made
- Action items with assigned owners
- Next steps and follow-ups

The AI instructions include automatically extracting action items and suggesting follow-up reminders."

**Taking Meeting Notes:**

**You:** "Add a meeting note for today's product planning session. Attendees were Sarah, Mike, and myself. We discussed Q4 roadmap priorities."

**AI:** "I've created a new meeting note titled 'Product Planning Session - [Today's Date]'. I've filled in the attendees and main topic. Would you like to add more details about the discussion or decisions made?"

**You:** "We decided to prioritize the mobile app redesign over the analytics dashboard. Sarah will own the mobile project and Mike will create user story tickets by Friday."

**AI:** "I've updated your meeting note with those decisions and extracted the action items:
- [ ] Sarah: Lead mobile app redesign project
- [ ] Mike: Create user story tickets (Due: Friday)

I've also linked this note to any existing notes about mobile app or Q4 planning."

### Workflow 2: Research and Learning Notes

**Setting Up Learning Notes:**

**You:** "I want to track books I'm reading and articles I find interesting. Create note types for these."

**AI:** "I'll create two note types for you:

**reading-notes** for books with fields for:
- Author and publication info
- Key concepts and insights
- Favorite quotes
- Personal reflections
- Rating and recommendation

**articles** for web articles and papers with:
- Source URL and author
- Main arguments
- Key takeaways
- Related topics
- My thoughts and reactions"

**Capturing Learning:**

**You:** "Add a reading note for 'Atomic Habits' by James Clear. The key insight is that small changes compound over time through the power of habit stacking."

**AI:** "I've created a reading note for 'Atomic Habits'. I've captured the compound change insight you mentioned. Based on the content, I suggest linking this to any existing notes about:
- Productivity systems
- Personal development
- Behavior change

Would you like me to add more details about specific habit strategies from the book?"

### Workflow 3: Project Management

**You:** "Create a note type for tracking projects. Include status, timeline, stakeholders, and key milestones."

**AI:** "I've created a 'projects' note type with comprehensive project tracking. The template includes status tracking, timeline management, stakeholder information, and milestone tracking. I've also set up automatic linking to related meeting notes and task extraction."

**You:** "Add a project note for the website redesign. Status is in progress, timeline is 6 weeks, stakeholders are the marketing team and design team."

**AI:** "Created your website redesign project note. Based on the timeline, I suggest we set up milestone check-ins. Should I create some template milestones like design approval, development phases, and launch preparation?"

## Advanced Features

### Smart Linking and Discovery

jade-note automatically suggests connections between your notes:

**You:** "Search for notes about habit formation"

**AI:** "I found 3 notes related to habit formation:
1. **Atomic Habits** (reading-notes) - about compound changes
2. **Morning Routine Project** (projects) - implementing daily habits  
3. **Productivity Meeting** (meetings) - discussed team habits

I notice these could be linked together. Would you like me to create explicit connections between them?"

### Content Enhancement

AI agents can enhance your notes automatically:

**You:** "Analyze my meeting notes from last week and suggest improvements"

**AI:** "I reviewed your recent meeting notes. Here are some suggestions:

**Missing Action Items**: Your Tuesday standup note mentions 'John will handle the API issue' but doesn't have it as a trackable action item.

**Unclear Decisions**: The architecture review note discusses two options but doesn't clearly state which was chosen.

**Follow-up Gaps**: Several meetings reference 'following up next week' but don't have specific dates or owners.

Would you like me to update these notes with the missing information?"

### Template Customization

**You:** "Update my meeting notes template to include a 'parking lot' section for off-topic items"

**AI:** "I've updated the meetings note type template to include a 'Parking Lot' section at the bottom for capturing off-topic items that come up during meetings. This will help keep meetings focused while ensuring important side topics aren't lost."

## Organization Strategies

### By Context and Purpose

Rather than organizing by topic, organize by how you'll use the information:

- **daily-logs**: What happened each day
- **decisions**: Important choices and their reasoning  
- **learnings**: Insights from books, courses, conversations
- **ideas**: Creative thoughts and brainstorms
- **reviews**: Retrospectives on projects, experiences
- **plans**: Future-focused thinking and strategy

### By Workflow Integration

Create note types that match your actual workflows:

- **client-calls**: For service providers tracking client interactions
- **1on1s**: For managers tracking team member development
- **experiments**: For researchers or product managers
- **recipes**: For cooking enthusiasts (yes, really!)
- **travel**: For frequent travelers planning and documenting trips

## Tips for Success

### Start Simple, Evolve Gradually

Begin with 2-3 note types that match your most common note-taking needs. Add more as you discover patterns in your information capture.

### Let AI Do the Heavy Lifting

Don't manually organize or link notes. Let the AI assistant:
- Extract action items automatically
- Suggest relevant connections
- Fill in template fields when possible
- Identify missing information

### Use Natural Language

Talk to your AI assistant like a human colleague:
- "What did we decide about the API architecture?"
- "Show me all my notes about machine learning from this month"
- "Create a summary of my project status for the team meeting"

### Keep Templates Flexible

Note type templates should guide structure, not enforce rigid formats. Include optional sections and let content vary naturally.

### Trust the File System

Remember that all your notes are just Markdown files in folders. You can:
- Edit them directly if needed
- Use version control (git) for backup
- Access them with any text editor
- Export or migrate easily

## Troubleshooting

### "AI Can't Find My Notes"

**Problem**: Assistant says it can't locate specific notes.

**Solution**: 
- Check that jade-note server is running (`npm start`)
- Verify your workspace directory contains the notes
- Try searching with different keywords

### "Note Type Creation Failed"

**Problem**: Error when creating new note types.

**Solution**:
- Ensure note type names are filesystem-safe (no special characters)
- Check that you have write permissions in your workspace
- Look for error details in `.jade-note/mcp-server.log`

### "Links Not Working"

**Problem**: Related notes aren't being connected.

**Solution**:
- Let the AI suggest links rather than forcing them
- Use consistent terminology across notes
- Rebuild search index if needed

## What's Next?

As you use jade-note, you'll discover your own patterns and preferences:

1. **Week 1**: Focus on creating 2-3 core note types
2. **Week 2**: Let AI start suggesting connections and improvements
3. **Month 1**: Refine templates based on actual usage
4. **Month 2**: Add specialized note types for unique workflows
5. **Ongoing**: Let the system evolve with your needs

### Advanced Integrations

Consider integrating jade-note with:
- **Git** for version control and collaboration
- **Task managers** by having AI extract action items
- **Calendar apps** by linking meeting notes to calendar events
- **Documentation systems** by exporting structured notes

## Philosophy: Notes as Living Documents

jade-note treats notes as living, evolving documents rather than static captures. Your AI assistant helps notes grow more valuable over time by:

- Adding context and connections
- Extracting actionable information  
- Suggesting related content
- Identifying knowledge gaps
- Facilitating review and reflection

This creates a knowledge base that becomes more useful the more you use it - a true second brain that actively helps you think and work better.

---

**Ready to start?** Begin with a simple conversation: "What note types should I create for my work?" and let your AI assistant guide you into the future of note-taking.

*jade-note: Where your notes and AI work together.*