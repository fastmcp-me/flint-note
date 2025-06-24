# flint-note Tutorial: Your Agent-First Note-Taking System

Welcome to flint-note! This tutorial will guide you through using flint-note, an innovative note-taking application designed from the ground up to work seamlessly with AI agents. Unlike traditional note apps that bolt on AI features, flint-note is built to be controlled entirely through natural language conversations with AI assistants.

## What Makes flint-note Different?

flint-note flips the script on note-taking:
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

1. **Get flint-note:**
   ```bash
   git clone <repository-url>
   cd flint-note
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
       "flint-note": {
         "command": "node",
         "args": ["/path/to/flint-note/src/server.ts"],
         "cwd": "/Users/yourname/my-knowledge-base"
       }
     }
   }
   ```

4. **Start flint-note:**
   ```bash
   # In the flint-note directory
   npm start
   ```

5. **Open your AI client** and you're ready to go!

## Core Concepts

### Note Types: The Heart of flint-note

Traditional note apps organize by folders or tags. flint-note organizes by **note types** - categories that carry semantic meaning. Each note type defines:

- **Purpose**: What kind of information belongs here
- **Agent Instructions**: Specific behaviors AI should exhibit with these notes
- **Templates**: Default structure for new notes
- **Behaviors**: Special actions (like extracting action items, asking for ratings, tracking deadlines)

#### Agent Instructions: Your Personal AI Assistant

A key innovation in flint-note is **agent instructions** - customizable guidelines that tell AI assistants exactly how to behave with each note type. For example:

- **Meeting notes**: "Always extract action items with owners and deadlines"
- **Reading notes**: "Ask for key insights and personal rating"
- **Project notes**: "Track milestones and identify potential blockers"

These instructions make your AI assistant increasingly intelligent and personalized to your workflow.

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

**AI:** "I'll create a 'meetings' note type for you with a template that includes:
- Meeting date and attendees
- Agenda/topics discussed
- Key decisions made
- Action items with assigned owners
- Next steps and follow-ups

I've also set up agent instructions so I'll automatically extract action items with owners, suggest follow-up reminders, and ask about meeting outcomes. These instructions help me provide better assistance specifically for your meeting notes."

**Taking Meeting Notes:**

**You:** "Add a meeting note for today's product planning session. Attendees were Sarah, Mike, and myself. We discussed Q4 roadmap priorities."

**AI:** "I've created a new meeting note titled 'Product Planning Session - [Today's Date]'. I've filled in the attendees and main topic. Would you like to add more details about the discussion or decisions made?"

**You:** "We decided to prioritize the mobile app redesign over the analytics dashboard. Sarah will own the mobile project and Mike will create user story tickets by Friday."

**AI:** "I've updated your meeting note with those decisions and extracted the action items:
- [ ] Sarah: Lead mobile app redesign project
- [ ] Mike: Create user story tickets (Due: Friday)

Following your meeting note agent instructions, I should also ask: What was the reasoning behind prioritizing mobile over analytics? And should I schedule a follow-up to check on progress next week? I've also linked this note to any existing notes about mobile app or Q4 planning."

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

I've set up agent instructions to always ask for key insights, your personal rating, and suggest connections to related books or your current projects.

**articles** for web articles and papers with:
- Source URL and author
- Main arguments
- Key takeaways
- Related topics
- My thoughts and reactions

For articles, the agent instructions include extracting the main argument, asking how it relates to your work, and suggesting follow-up research topics."

**Capturing Learning:**

**You:** "Add a reading note for 'Atomic Habits' by James Clear. The key insight is that small changes compound over time through the power of habit stacking."

**AI:** "I've created a reading note for 'Atomic Habits'. I've captured the compound change insight you mentioned. Following your reading notes agent instructions, I should also ask: What's your rating for this book so far, and how might you apply habit stacking in your current projects?

Based on the content, I suggest linking this to any existing notes about:
- Productivity systems
- Personal development
- Behavior change

Would you like me to add more details about specific habit strategies from the book?"

### Workflow 3: Project Management

**You:** "Create a note type for tracking projects. Include status, timeline, stakeholders, and key milestones."

**AI:** "I've created a 'projects' note type with comprehensive project tracking. The template includes status tracking, timeline management, stakeholder information, and milestone tracking. I've set up agent instructions to always ask about project goals and success criteria, extract action items with deadlines, identify potential blockers, and automatically link to related meeting notes and documents."

**You:** "Add a project note for the website redesign. Status is in progress, timeline is 6 weeks, stakeholders are the marketing team and design team."

**AI:** "Created your website redesign project note. Based on the timeline, I suggest we set up milestone check-ins. Should I create some template milestones like design approval, development phases, and launch preparation?"

## Advanced Features

### Smart Linking and Discovery

flint-note automatically suggests connections between your notes:

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

### Customizing Agent Instructions and Templates

**You:** "Update my meeting notes template to include a 'parking lot' section for off-topic items"

**AI:** "I've updated the meetings note type template to include a 'Parking Lot' section at the bottom for capturing off-topic items that come up during meetings. This will help keep meetings focused while ensuring important side topics aren't lost."

**You:** "Make sure agents always ask about next steps when I create project notes"

**AI:** "I've updated your project notes agent instructions to include next steps tracking. Now whenever you create or update project notes, I'll automatically ask about immediate next steps, upcoming milestones, and any blockers that need attention."

**You:** "What agent instructions do I have for reading notes?"

**AI:** "Let me check your reading notes configuration... Your current agent instructions are:
- Always ask for key insights and takeaways
- Request your personal rating and recommendation
- Suggest connections to related books and topics
- Ask how the content applies to your current projects
- Extract notable quotes automatically

Would you like me to modify any of these behaviors?"

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
- Extract action items automatically based on agent instructions
- Suggest relevant connections using contextual understanding
- Fill in template fields when possible
- Identify missing information according to note type requirements
- Follow agent instructions to provide contextually appropriate assistance
- Evolve and improve note type behaviors based on your patterns

### Use Natural Language

Talk to your AI assistant like a human colleague:
- "What did we decide about the API architecture?"
- "Show me all my notes about machine learning from this month"
- "Create a summary of my project status for the team meeting"
- "Make sure agents ask about deadlines when I create project notes"
- "Update my reading notes to always ask for book recommendations"
- "What behaviors do agents have for my meeting notes?"

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
- Check that flint-note server is running (`npm start`)
- Verify your workspace directory contains the notes
- Try searching with different keywords

### "Note Type Creation Failed"

**Problem**: Error when creating new note types.

**Solution**:
- Ensure note type names are filesystem-safe (no special characters)
- Check that you have write permissions in your workspace
- Look for error details in `.flint-note/mcp-server.log`

### "Links Not Working"

**Problem**: Related notes aren't being connected.

**Solution**:
- Let the AI suggest links rather than forcing them
- Use consistent terminology across notes
- Rebuild search index if needed

## What's Next?

As you use flint-note, you'll discover your own patterns and preferences:

1. **Week 1**: Focus on creating 2-3 core note types with basic agent instructions
2. **Week 2**: Let AI start suggesting connections and improvements, refine agent instructions based on your workflow
3. **Month 1**: Customize agent instructions and templates based on actual usage patterns
4. **Month 2**: Add specialized note types for unique workflows with sophisticated agent behaviors
5. **Ongoing**: Let the system evolve with your needs, continuously improving agent instructions for better personalization

### Advanced Integrations

Consider integrating flint-note with:
- **Git** for version control and collaboration
- **Task managers** by having AI extract action items
- **Calendar apps** by linking meeting notes to calendar events
- **Documentation systems** by exporting structured notes

## Philosophy: Notes as Living Documents

flint-note treats notes as living, evolving documents rather than static captures. Your AI assistant helps notes grow more valuable over time by:

- Adding context and connections based on agent instructions
- Extracting actionable information according to note type behaviors
- Suggesting related content using semantic understanding
- Identifying knowledge gaps and missing information
- Facilitating review and reflection through intelligent prompts
- **Learning your preferences** and evolving agent instructions to become increasingly personalized

This creates a knowledge base that becomes more useful the more you use it - a true second brain that actively helps you think and work better, with AI that understands your specific workflow and adapts to your needs.

---

**Ready to start?** Begin with a simple conversation: "What note types should I create for my work?" and let your AI assistant guide you into the future of note-taking.

*flint-note: Where your notes and AI work together.*
