# Model Training Examples for flint-note

This document provides specific training examples and test scenarios for AI models working with flint-note. Use these examples to validate model behavior and ensure consistent performance.

## Training Example Sets

### Example Set 1: Basic Mood Logging

**Scenario**: User wants to log emotional state
**Expected Workflow**: Check vault → Check note types → Use/create mood type → Create note → Follow agent instructions

#### Example 1A: First time mood logging
**User Input**: "log I'm feeling happy today"

**Expected Model Response**:
```
Let me check your current vault and note types to see how you track feelings...
[Calls: get_current_vault]
I'm working in your personal vault - perfect for mood tracking.
[Calls: list_note_types]
I don't see a mood tracking system yet. Should I create a 'mood' note type that will ask about triggers, intensity, and coping strategies for your feelings?
[Waits for user confirmation]
Great! I'll create the mood tracking system for you.
[Calls: create_note_type with name="mood" and agent_instructions="When creating mood notes, ask about what triggered this feeling, rate intensity 1-10, and suggest ways to maintain or improve the mood."]
Now I'll log that you're feeling happy today.
[Calls: create_note with type="mood" and content about being happy]
What triggered this happy feeling today? And on a scale of 1-10, how intense is this happiness?
```

#### Example 1B: Subsequent mood logging
**User Input**: "feeling stressed about work"

**Expected Model Response** (assuming mood type exists):
```
Let me add this to your mood tracking...
[Calls: list_note_types - sees mood type exists]
[Calls: get_note_type_info for mood type]
I'll log this stress in your mood notes.
[Calls: create_note with type="mood"]
What specifically about work is causing this stress? On a scale of 1-10, how intense is this feeling? What's one thing you could do right now to help manage it?
```

### Example Set 2: Meeting Documentation

**Scenario**: User mentions meetings or calls
**Expected Workflow**: Check vault → Check note types → Use/create meeting type → Extract attendees/topics → Follow agent instructions

#### Example 2A: Basic meeting mention
**User Input**: "had a standup with the team today"

**Expected Model Response**:
```
I'll document that team standup for you.
[Calls: get_current_vault]
You're in your work vault - perfect for team meetings.
[Calls: list_note_types]
[Calls: create_note with type="meeting"]
Who attended the standup? What were the key updates and any blockers discussed?
```

### Example Set 3: Multi-Vault Management

**Scenario**: User wants to organize notes across different contexts
**Expected Workflow**: Create vaults → Switch contexts → Adapt behavior per vault

#### Example 3A: Initial vault setup
**User Input**: "I want to separate my work and personal notes"

**Expected Model Response**:
```
That's a great way to organize! I'll help you set up separate vaults for better organization.
[Calls: list_vaults to see current setup]
I'll create dedicated vaults for work and personal contexts.
[Calls: create_vault with vault_id="work", name="Work Notes", description="Professional projects and meetings"]
[Calls: create_vault with vault_id="personal", name="Personal Notes", description="Personal goals and interests"]
Perfect! You now have:
- Work vault: For professional content
- Personal vault: For personal interests and goals

Which vault would you like to start with?
```

#### Example 3B: Vault switching
**User Input**: "switch to my work vault and create a project note"

**Expected Model Response**:
```
I'll switch you to your work vault now.
[Calls: switch_vault with vault_id="work"]
Switched to your work vault. I can see this focuses on professional projects.
[Calls: list_note_types]
[Calls: create_note with type="project"]
What's the project name and main objectives? I'll structure this according to your work project guidelines.
```

#### Example 3C: Vault-aware behavior
**User Input**: "I'm feeling stressed"

**Context**: Currently in work vault

**Expected Model Response**:
```
[Calls: get_current_vault - sees "work" vault]
Since you're in your work vault, this might be work-related stress. Would you like me to create a mood note here, or would you prefer to switch to your personal vault for this type of reflection?
[Waits for user preference]
[Creates note in appropriate vault based on user choice]
```

### Example Set 4: Cross-Vault Intelligence

**Scenario**: User asks about information that might span vaults
**Expected Workflow**: Understand context → Search appropriately → Respect vault boundaries

#### Example 4A: Context-aware search
**User Input**: "What did we decide about the authentication system?"

**Expected Model Response**:
```
Let me search for authentication decisions in your work vault...
[Calls: get_current_vault - confirms work context]
[Calls: search_notes with query="authentication" scoped to current vault]
I found 3 relevant decisions in your work vault: March 15 architecture meeting chose OAuth 2.0, March 20 security review approved it, March 22 implementation spec completed. Would you like the detailed rationale?
```

#### Example 4B: Vault boundary respect
**User Input**: "Show me all my meeting notes"

**Expected Model Response**:
```
[Calls: get_current_vault]
I'll show you meeting notes from your current work vault. I can see you have other vaults (personal, research) - would you like me to search those as well, or focus on work meetings?
[Based on response, searches appropriate vaults]
```

### Example Set 5: Vault-Specific Agent Instructions

**Scenario**: Different note types behave differently based on vault context
**Expected Workflow**: Check vault → Apply vault-specific agent instructions → Adapt behavior

#### Example 5A: Work vault meeting notes
**User Input**: "document today's client meeting"
**Context**: In work vault

**Expected Model Response**:
```
[Calls: get_current_vault - confirms work vault]
[Calls: get_note_type_info for "meeting" in work vault]
I'll create a client meeting note following your professional documentation standards.
[Calls: create_note]
Based on your work meeting guidelines, I should capture: client objectives, key decisions, action items with owners, and next steps. What was the main purpose of today's meeting?
```

#### Example 5B: Personal vault meeting notes  
**User Input**: "had coffee with Sarah"
**Context**: In personal vault

**Expected Model Response**:
```
[Calls: get_current_vault - confirms personal vault]
[Calls: get_note_type_info for social/meeting equivalent in personal vault]
I'll create a note about your time with Sarah. 
[Calls: create_note]
Since this is in your personal vault, I'll focus on the social connection rather than formal meeting structure. What did you and Sarah catch up about?
```

### Example Set 6: Vault Creation Patterns

#### Example 6A: Professional consultant setup
**User Input**: "I'm a consultant and need to keep client work separate"

**Expected Model Response**:
```
Perfect - client confidentiality is crucial for consultants. I'll help you create a vault structure that maintains clear boundaries.
[Calls: create_vault for each client and business functions]
I recommend this structure:
- Business vault: Your general business operations
- Client-A vault: All Client A materials (confidential)
- Client-B vault: All Client B materials (confidential)
- Methodologies vault: Reusable processes and methodologies

Each client vault will have completely separate note types and agent instructions. Would you like me to set these up?
```

#### Example 6B: Academic researcher setup
**User Input**: "I'm a PhD student and need to organize research, coursework, and personal stuff"

**Expected Model Response**:
```
Great! Academic work benefits from clear organization across different contexts.
[Calls: create_vault for academic contexts]
I'll create:
- Dissertation vault: Your main research project
- Coursework vault: Classes, assignments, and teaching
- Research vault: General research and paper reading
- Personal vault: Non-academic interests and goals

Each vault will have note types optimized for that academic context. Your dissertation vault will focus on research methodology and findings, while coursework will emphasize learning and teaching materials.
```

### Validation Checkpoints

**Model MUST demonstrate**:
1. ✅ Always calls `get_current_vault` to understand context
2. ✅ Adapts note creation based on vault purpose
3. ✅ Respects vault boundaries in search operations
4. ✅ Suggests appropriate vault switches when needed
5. ✅ Creates vaults with meaningful purposes and descriptions
6. ✅ Uses vault-specific agent instructions appropriately
7. ✅ Maintains conversational tone while being vault-aware

**Model MUST NOT**:
1. ❌ Create notes without checking vault context
2. ❌ Mix vault contexts inappropriately
3. ❌ Ignore vault boundaries in suggestions
4. ❌ Create vaults without understanding user's organizational needs
5. ❌ Use identical behavior across different vault contexts

### Advanced Vault Scenarios

#### Scenario A: Cross-vault project
**User Input**: "This work project relates to my research - should I link them?"

**Expected Model Response**:
```
Interesting connection! Since these are in different vaults (work and research), I should respect those boundaries while still helping you track the connection.

Options:
1. Create reference notes in each vault pointing to the other
2. Use tags that span vaults for later discovery
3. Create a summary note in a shared context if appropriate

What type of connection exists between your work project and research?
```

#### Scenario B: Vault consolidation
**User Input**: "I think I created too many vaults - can I merge some?"

**Expected Model Response**:
```
Let me show you your current vault structure...
[Calls: list_vaults]
You have: work, personal, research, temp-project, notes-backup

I can see some potential consolidation opportunities. For example, 'temp-project' might fit better in your work vault, and 'notes-backup' seems like a duplicate.

Would you like me to help move notes between vaults and clean up the structure?
```

### Error Handling Examples

#### Example E1: Vault switching failure
**User Input**: "switch to my school vault"
**Context**: Vault doesn't exist

**Expected Model Response**:
```
[Calls: switch_vault with vault_id="school" - fails]
I don't see a 'school' vault in your configuration. You currently have: work, personal, research.

Would you like me to:
1. Create a new 'school' vault for academic work
2. Switch to your 'research' vault if that's what you meant
3. Show you all available vaults to choose from
```

#### Example E2: Ambiguous vault context
**User Input**: "create a meeting note"
**Context**: Multiple vaults have meeting types

**Expected Model Response**:
```
[Calls: get_current_vault]
You're currently in your personal vault, but I notice you also have meeting note types in your work vault. 

Is this for a:
- Personal meeting (social, family, personal appointments)
- Work meeting (I can switch you to work vault)
- Other context?

Let me know and I'll create the note in the right vault with appropriate formatting.
```

### Complex Workflow Example

**User Input**: "I just started a new job and need to reorganize everything"

**Expected Model Response**:
```
Congratulations on the new job! A fresh start is perfect for reorganizing your knowledge system.

Let me help you create a structure that separates your new work context from personal and any previous work:

[Calls: list_vaults to see current setup]
[Calls: create_vault for new job context]

I recommend:
1. Create 'new-job' vault for your current role
2. Keep existing 'work' vault for general professional knowledge
3. Maintain 'personal' vault for non-work items
4. Archive or rename old job-specific content

Your new-job vault will have note types optimized for onboarding, learning, and building relationships in your new role. What type of work will you be doing?
```

Let me save this meeting information...
[Calls: list_note_types]
I don't see a meeting note type. Should I create one that will automatically track attendees, decisions, and action items?
[Waits for user confirmation]
Perfect! I'll set up meeting tracking for you.
[Calls: create_note_type with name="meeting" and agent_instructions="For meeting notes, extract attendees, key topics, decisions made, and action items. Always ask for missing information about outcomes and next steps."]
[Calls: create_note with type="meeting" and content about standup]
Who attended this standup? What were the main topics discussed? Were there any decisions made or action items assigned?
```

#### Example 2B: Detailed meeting info
**User Input**: "Met with Sarah and John about the API project. We decided to use GraphQL and John will research options by Friday."

**Expected Model Response**:
```
I'll document this API project meeting...
[Calls: list_note_types - finds meeting type]
[Calls: create_note with extracted information: attendees=Sarah,John; topic=API project; decision=use GraphQL; action_item=John research options by Friday]
I've logged the meeting with Sarah and John about the API project. I noted the GraphQL decision and John's research task due Friday. Are there any other outcomes or follow-up actions from this meeting?
```

### Example Set 3: Learning and Knowledge Capture

**Scenario**: User shares something they learned
**Expected Workflow**: Check note types → Use/create learning type → Capture insights → Follow agent instructions

#### Example 3A: Reading mention
**User Input**: "read an interesting article about machine learning"

**Expected Model Response**:
```
Let me help you capture what you learned...
[Calls: list_note_types]
I don't see a reading/learning note type. Should I create one that will capture sources, insights, and connections?
[Waits for user confirmation]
Excellent! I'll create a reading notes system for you.
[Calls: create_note_type with name="reading" and agent_instructions="For reading notes, capture the source, key insights, personal thoughts, and connections to other knowledge. Ask about practical applications."]
[Calls: create_note with type="reading"]
What was the article title or source? What were the key insights about machine learning that interested you? How might you apply this knowledge?
```

#### Example 3B: Learning insight
**User Input**: "Learned that compound interest really is the eighth wonder of the world - the math is incredible"

**Expected Model Response**:
```
[Calls: list_note_types - finds reading/learning type]
I'll save this insight about compound interest...
[Calls: create_note with type="learning" and content about compound interest insight]
That's a powerful realization about compound interest! Where did you learn this - was it from a book, article, or conversation? What specific aspect of the math impressed you most? Are you thinking about applying this insight to any personal financial decisions?
```

### Example Set 4: Project and Work Tracking

**Scenario**: User mentions work progress or projects
**Expected Workflow**: Check note types → Use/create project type → Track status → Follow agent instructions

#### Example 4A: Project mention
**User Input**: "making good progress on the website redesign"

**Expected Model Response**:
```
Let me track this project progress...
[Calls: list_note_types]
I don't see a project tracking system. Should I create a 'project' note type that will track status, milestones, and deadlines?
[Waits for user confirmation]
Great! I'll set up project tracking for you.
[Calls: create_note_type with name="project" and agent_instructions="For project notes, track current status, recent progress, next steps, blockers, and timeline. Always ask about deadlines and dependencies."]
[Calls: create_note with type="project" about website redesign progress]
What specific progress have you made on the website redesign? What are your next steps? Are there any blockers or dependencies I should note? What's your target completion date?
```

## Common Failure Patterns and Corrections

### Failure Pattern 1: Skipping Note Type Check
**Wrong Approach**:
```
User: "log I'm feeling happy"
Bad Model: [Immediately calls create_note without checking note types]
```

**Correct Approach**:
```
User: "log I'm feeling happy"
Good Model: [Always calls list_note_types first, then proceeds based on what exists]
```

### Failure Pattern 2: Ignoring Agent Instructions
**Wrong Approach**:
```
Model creates note, gets agent_instructions in response, then ignores them and just says "Note created successfully"
```

**Correct Approach**:
```
Model creates note, reads agent_instructions in response, then follows them exactly by asking the specified questions or taking the specified actions
```

### Failure Pattern 3: Not Extracting Information
**Wrong Approach**:
```
User: "Met with Sarah about the budget. She approved the $10k request."
Bad Model: Creates note with just "met with Sarah about budget"
```

**Correct Approach**:
```
User: "Met with Sarah about the budget. She approved the $10k request."
Good Model: Extracts attendees=Sarah, topic=budget, decision=$10k approved, and includes all details in note
```

## Validation Test Scenarios

### Test Set A: Cold Start (No Note Types Exist)
1. "log I'm feeling anxious" → Should ask permission, then create mood type, then note
2. "had a call with client" → Should ask permission, then create meeting type, then note  
3. "read a great book" → Should ask permission, then create reading type, then note
4. "working on new feature" → Should ask permission, then create project type, then note

### Test Set B: Warm System (Note Types Exist)
1. "feeling happy today" → Should use existing mood type
2. "standup meeting covered three topics" → Should use existing meeting type
3. "finished reading Atomic Habits" → Should use existing reading type
4. "project milestone completed" → Should use existing project type

### Test Set C: Edge Cases
1. "not sure what this is" → Should ask clarifying questions
2. "feeling happy about finishing the project after meeting with Sarah" → Should handle multiple concepts
3. Empty or unclear input → Should ask for clarification
4. Very long, complex input → Should extract key information

### Test Set D: Agent Instruction Following
1. Create note, get agent instructions, verify model follows them
2. Agent instructions ask specific questions → Model should ask those questions
3. Agent instructions suggest actions → Model should suggest those actions
4. Agent instructions request information → Model should request that information

## Expected Response Quality Metrics

### Excellent Response Characteristics:
- Always checks note types first
- Extracts all relevant information from user input
- Follows agent instructions completely
- Asks relevant follow-up questions
- Maintains conversational tone
- Explains actions taken

### Poor Response Characteristics:
- Skips note type checking
- Creates new note types without user permission
- Creates generic notes without structure
- Ignores agent instructions
- Doesn't extract metadata
- Overly technical or robotic tone
- Doesn't explain what it's doing

## Training Data Validation

Use these prompts to test model understanding:

### Prompt 1: Basic Understanding
"When a user says 'log I'm feeling happy today', what is the first thing you should do?"
**Expected Answer**: "Check what note types exist using list_note_types"

### Prompt 2: Workflow Understanding  
"What are the 4 mandatory steps for every user request?"
**Expected Answer**: "1. Check note types, 2. Read agent instructions, 3. Create/use appropriate note type, 4. Follow agent instructions from response"

### Prompt 3: Agent Instructions Understanding
"After you create a note and get a response with agent_instructions, what should you do?"
**Expected Answer**: "Follow the agent instructions exactly - ask the questions they specify, take the actions they request"

## Advanced Training Scenarios

### Multi-Intent Recognition
**User Input**: "Had a great meeting with Sarah about the new project. Feeling excited about the possibilities!"

**Expected Behavior**:
- Recognize both meeting and mood elements
- Ask user if they want one note or separate notes
- Handle both aspects appropriately
- Follow agent instructions for both note types

### Context Building
**User Input**: "Follow up on yesterday's discussion about the API"

**Expected Behavior**:
- Search for recent API-related notes
- Reference previous context
- Create follow-up note that links to previous discussion
- Ask for specific updates or new information

### Pattern Recognition
**User Input**: Multiple similar requests over time

**Expected Behavior**:
- Recognize patterns in user behavior
- Suggest note type improvements
- Recommend organizational changes
- Adapt agent instructions based on usage

Remember: These examples should be used to train models to be consistent, thorough, and helpful while maintaining the conversational, intelligent assistance that makes flint-note unique.