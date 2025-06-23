# Model Training Examples for jade-note

This document provides specific training examples and test scenarios for AI models working with jade-note. Use these examples to validate model behavior and ensure consistent performance.

## Training Example Sets

### Example Set 1: Basic Mood Logging

**Scenario**: User wants to log emotional state
**Expected Workflow**: Check note types → Use/create mood type → Create note → Follow agent instructions

#### Example 1A: First time mood logging
**User Input**: "log I'm feeling happy today"

**Expected Model Response**:
```
Let me check your note types to see how you track feelings...
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
**Expected Workflow**: Check note types → Use/create meeting type → Extract attendees/topics → Follow agent instructions

#### Example 2A: Basic meeting mention
**User Input**: "had a standup with the team today"

**Expected Model Response**:
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

Remember: These examples should be used to train models to be consistent, thorough, and helpful while maintaining the conversational, intelligent assistance that makes jade-note unique.