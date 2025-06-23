# Weak Model Implementation Guide for jade-note

This guide provides everything needed to successfully implement jade-note with weaker AI models that require explicit, step-by-step instructions.

## Quick Start for Implementation

### For Very Weak Models (Simple Pattern Matching)
Use: `SIMPLE_MODEL_PROMPTS.md`
- Ultra-simple 4-step workflow
- Template-based responses
- Minimal decision making required

### For Moderately Weak Models (Can Follow Procedures)
Use: `EXPLICIT_MODEL_PROMPTS.md`
- Detailed step-by-step instructions
- Clear decision trees
- Explicit error handling

### For Training and Validation
Use: `MODEL_TRAINING_EXAMPLES.md`
- Comprehensive test scenarios
- Expected response patterns
- Failure pattern identification

## Implementation Strategy

### Phase 1: Basic Functionality
1. Start with `SIMPLE_MODEL_PROMPTS.md`
2. Test with basic scenarios:
   - "log I'm feeling happy"
   - "had a meeting with John"
   - "read an interesting article"
3. Verify 4-step workflow is followed consistently
4. Move to Phase 2 only after 95%+ success rate

### Phase 2: Enhanced Behavior
1. Upgrade to `EXPLICIT_MODEL_PROMPTS.md`
2. Add decision tree capabilities
3. Test with complex scenarios from training examples
4. Implement error recovery patterns

### Phase 3: Optimization
1. Use training examples for fine-tuning
2. Add custom note types for specific domains
3. Implement pattern recognition
4. Monitor and improve based on usage

## Model Configuration Templates

### Template 1: Ultra-Simple Configuration
```
SYSTEM: You help users save notes. For EVERY user message, do these 4 steps in order:
STEP 1: Run `list_note_types`
STEP 2: Look at the list and pick the best match for user's message
STEP 2b: If no good match exists, ASK USER before creating new note type
STEP 3: Run `create_note` with that note type
STEP 4: Do what the response tells you to do

Pattern matching rules:
- Feelings/mood → "mood" type
- Meetings/calls → "meeting" type  
- Reading/learning → "reading" type
- Work/projects → "project" type

NEVER create note types without asking user first.
ALWAYS follow the 4 steps. Keep responses simple.
```

### Template 2: Structured Workflow Configuration
```
SYSTEM: You are helping users with jade-note. Follow this exact workflow:

MANDATORY WORKFLOW:
1. FIRST: Always use `list_note_types` to see what exists
2. SECOND: Read agent instructions for relevant note types
3. THIRD: If need new note type, ASK USER PERMISSION first
4. FOURTH: Create new note type if needed, or use existing
5. FIFTH: Create note with `create_note`
6. SIXTH: Follow agent instructions from the response exactly

DECISION TREE:
- User wants to save info → Check note types → Ask permission if creating new type → Create note → Follow instructions
- User wants to find info → Use `search_notes`
- User unclear → Ask ONE simple question

NEVER skip step 1. NEVER create note types without user permission. ALWAYS follow agent instructions from responses.
```

### Template 3: Enhanced Configuration with Error Handling
```
SYSTEM: [Include full EXPLICIT_MODEL_PROMPTS.md content]

Additional behaviors:
- If confused, ask exactly: "Should I create a [type] note for this?"
- If tool fails, say: "Let me try that again" and retry once
- Always explain what you're doing: "I'm checking your note types..."
- Extract metadata automatically: dates, people, decisions, actions

Success criteria:
- Every request starts with checking note types
- Agent instructions are always followed
- Users understand what you're doing
- Information is captured accurately
```

## Testing and Validation

### Required Test Cases
Every implementation MUST pass these scenarios:

#### Test Case 1: Cold Start Mood Logging
**Input**: "log I'm feeling happy today"
**Expected Flow**:
1. `list_note_types` → returns empty or no mood type
2. **ASK USER**: "I don't see a mood tracking system. Should I create a 'mood' note type that will ask about triggers and intensity?"
3. Wait for user confirmation
4. If confirmed, create "mood" note type with appropriate agent instructions
5. `create_note` with mood type and content
6. Follow agent instructions (ask about intensity, triggers, etc.)

#### Test Case 2: Existing Note Type Usage
**Input**: "feeling stressed" (when mood type exists)
**Expected Flow**:
1. `list_note_types` → finds mood type
2. `get_note_type_info` for mood type
3. `create_note` with mood type
4. Follow existing agent instructions

#### Test Case 3: Meeting Documentation
**Input**: "met with Sarah about the project"
**Expected Flow**:
1. Check note types
2. If no meeting type exists, **ASK USER**: "Should I create a meeting note type that tracks attendees and decisions?"
3. Wait for confirmation, then create/use meeting type
4. Extract: attendees=Sarah, topic=project
5. Follow meeting agent instructions

#### Test Case 4: Complex Multi-Intent
**Input**: "Had a great meeting with John about the new API. Really excited about this project!"
**Expected Behavior**:
- Recognize meeting and mood elements
- Handle appropriately (ask user preference or create linked notes)
- Follow agent instructions for both aspects

### Validation Criteria

#### PASS Criteria:
✅ Always checks note types first
✅ **Always asks user permission before creating new note types**
✅ Follows 4-step workflow consistently  
✅ Extracts information from user input
✅ Follows agent instructions from responses
✅ Asks relevant follow-up questions
✅ Explains actions clearly
✅ Handles errors gracefully

#### FAIL Criteria:
❌ Creates notes without checking note types
❌ **Creates new note types without user permission**
❌ Ignores agent instructions in responses
❌ Doesn't extract information from user input
❌ Skips workflow steps
❌ Gives generic "note created" responses
❌ Crashes on unexpected input

## Common Implementation Issues

### Issue 1: Model Skips Note Type Check
**Symptom**: Immediately creates notes without checking existing types
**Solution**: Emphasize in system prompt that step 1 is MANDATORY
**Fix**: Add explicit "NEVER create notes without running list_note_types first"

### Issue 1b: Model Creates Note Types Without Permission
**Symptom**: Creates new note types without asking user first
**Solution**: Add mandatory user confirmation step before any note type creation
**Fix**: Include "ALWAYS ask user permission before creating new note types" in system prompt

### Issue 2: Agent Instructions Ignored
**Symptom**: Creates note but doesn't follow agent instructions in response
**Solution**: Explicitly state "Do exactly what the agent_instructions tell you"
**Fix**: Add examples of following agent instructions

### Issue 3: Poor Information Extraction
**Symptom**: Creates notes with minimal content, misses key information
**Solution**: Add explicit extraction rules to system prompt
**Fix**: Include examples of what to extract for each note type

### Issue 4: Robotic Responses
**Symptom**: Technical responses like "Note created successfully"
**Solution**: Provide conversational response templates
**Fix**: Include natural language examples in prompts

### Issue 5: Decision Paralysis
**Symptom**: Model gets stuck when facing choices
**Solution**: Provide explicit decision trees and default choices
**Fix**: Add "when in doubt, ask one simple question" rule

## Deployment Checklist

### Pre-Deployment Testing
- [ ] Test all scenarios from `MODEL_TRAINING_EXAMPLES.md`
- [ ] Verify 4-step workflow followed consistently
- [ ] **Confirm user permission requested before creating new note types**
- [ ] Confirm agent instructions are followed
- [ ] Test error recovery patterns
- [ ] Validate information extraction accuracy
- [ ] Check conversational tone quality

### Deployment Configuration
- [ ] Choose appropriate prompt template (Simple/Explicit/Enhanced)
- [ ] Configure note type creation permissions
- [ ] Set up error logging and monitoring
- [ ] Define success metrics and thresholds
- [ ] Implement feedback collection mechanism

### Post-Deployment Monitoring
- [ ] Track workflow step completion rates
- [ ] Monitor agent instruction following
- [ ] Measure user satisfaction scores
- [ ] Log and analyze failure patterns
- [ ] Collect improvement suggestions

## Performance Optimization

### For Better Accuracy
1. Use more specific pattern matching rules
2. Add domain-specific note type templates
3. Include more extraction examples
4. Implement confidence scoring for decisions

### For Better User Experience
1. Reduce response time with simpler prompts
2. Add personality and warmth to templates
3. Implement context awareness across conversations
4. Create shortcuts for common patterns

### For Better Learning
1. Log successful interaction patterns
2. Update agent instructions based on usage
3. Add new note types for emerging patterns
4. Implement user preference learning

## Troubleshooting Guide

### Model Creates Notes Without Checking Types
**Diagnosis**: System prompt not emphasizing mandatory workflow
**Fix**: Add "NEVER create notes without list_note_types" to beginning of prompt

### Model Doesn't Follow Agent Instructions
**Diagnosis**: Not understanding response format or importance
**Fix**: Add explicit examples of following agent instructions

### Model Gives Generic Responses
**Diagnosis**: Lacks conversational templates
**Fix**: Include specific response templates for each scenario

### Model Gets Confused by Complex Input
**Diagnosis**: Needs simpler decision-making process
**Fix**: Switch to simpler prompt template, add clarification rules

### Model Performance Degrades Over Time
**Diagnosis**: Context window limitations or prompt drift
**Fix**: Implement session management, refresh key instructions periodically

## Success Metrics

### Technical Metrics
- **Workflow Compliance**: 95%+ of interactions follow 4-step process
- **User Permission Compliance**: 100% of new note type creations ask user first
- **Agent Instruction Following**: 90%+ of responses implement agent instructions
- **Information Extraction**: 85%+ of relevant details captured
- **Error Recovery**: 95%+ of errors handled gracefully

### User Experience Metrics
- **User Satisfaction**: 4+ stars average rating
- **Task Completion**: 90%+ of user intents successfully handled
- **Efficiency**: Average 2-3 exchanges to complete note creation
- **Learning**: System demonstrates improvement over time

### System Health Metrics
- **Uptime**: 99%+ availability
- **Response Time**: <2 seconds average
- **Error Rate**: <5% of interactions fail
- **Data Quality**: 95%+ of notes contain meaningful, structured information

## Getting Help

If implementation issues persist:

1. **Review Training Examples**: Check `MODEL_TRAINING_EXAMPLES.md` for similar scenarios
2. **Simplify Prompts**: Try `SIMPLE_MODEL_PROMPTS.md` if current approach too complex
3. **Test Incrementally**: Implement one feature at a time, validate before adding more
4. **Monitor Carefully**: Log all interactions during initial deployment
5. **Iterate Quickly**: Make small adjustments based on real usage patterns

Remember: The goal is reliable, helpful assistance. Start simple, validate thoroughly, and improve incrementally based on real user feedback.