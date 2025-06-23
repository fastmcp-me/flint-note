# jade-note Prompts Quick Reference Card

## 🚀 Instant Setup Guide

### I need a prompt for...

| **Use Case** | **File** | **Best For** |
|-------------|----------|--------------|
| **GPT-4, Claude 3.5+** | `system_core.md` | Standard powerful models |
| **GPT-3.5, smaller models** | `simple_models_detailed.md` | Models that need structure |
| **Very basic models** | `simple_models_basic.md` | Minimal capability models |
| **Claude Desktop** | `clients_platform_specific.md` | Platform integration |
| **Custom integration** | `_overview.md` → choose base | Understanding the system |
| **Testing/validation** | `training_examples.md` | Ensuring it works |

## 📋 Implementation Checklist

### Standard Models (GPT-4, Claude 3.5+)
- [ ] Copy `system_core.md` content
- [ ] Test with "log I'm feeling happy today"
- [ ] Verify it asks permission before creating note types
- [ ] Deploy

### Weak Models (GPT-3.5, smaller models)
- [ ] Start with `simple_models_basic.md` 
- [ ] Test 4-step workflow works
- [ ] If successful, try `simple_models_detailed.md`
- [ ] Use `training_examples.md` for validation
- [ ] Follow `implementation_guide.md` for deployment

### Platform Integration
- [ ] Check `clients_platform_specific.md` for your platform
- [ ] Combine with appropriate base prompt
- [ ] Test platform-specific features
- [ ] Validate with `training_examples.md`

## ⚡ Copy-Paste Templates

### Ultra-Simple (4-Step)
```
You help users save notes. For EVERY user message, do these 4 steps:
1. Run `list_note_types`
2. Pick best match OR ask user to create new type
3. Run `create_note` 
4. Follow agent instructions from response

NEVER create note types without asking user first.
```

### Standard Model
```
You are an AI assistant with jade-note. Core behaviors:
- Always check note types before creating notes
- Ask user permission before creating new note types  
- Follow agent instructions from responses exactly
- Extract information automatically (people, dates, decisions)
- Maintain conversational, helpful tone

[Include full system_core.md content]
```

## 🎯 Key Validation Tests

Test these scenarios with ANY prompt:

1. **"log I'm feeling happy today"**
   - ✅ Checks note types first
   - ✅ Asks permission to create mood type
   - ✅ Creates note only after permission
   - ✅ Follows agent instructions

2. **"had a meeting with John"** 
   - ✅ Checks for meeting note type
   - ✅ Extracts attendee info
   - ✅ Asks permission if creating new type

3. **"feeling stressed"** (when mood type exists)
   - ✅ Uses existing mood type
   - ✅ Follows existing agent instructions
   - ✅ No permission needed

## 🚨 Common Issues & Fixes

| **Problem** | **Quick Fix** |
|------------|---------------|
| Creates notes without checking types | Add "ALWAYS run list_note_types first" |
| Creates note types without asking | Add "NEVER create note types without user permission" |
| Ignores agent instructions | Add examples of following instructions |
| Too robotic | Use conversational templates |
| Gets confused | Switch to simpler prompt file |

## 📱 Platform Quick Start

### Claude Desktop
```json
{
  "jade-note": {
    "prompt": "[content from system_core.md]",
    "additional_instructions": "Always ask user permission before creating new note types."
  }
}
```

### API Integration
```python
system_prompt = open('prompts/system_core.md').read()
# Add user permission emphasis
system_prompt += "\n\nIMPORTANT: Always ask user permission before creating new note types."
```

## 🔄 Upgrade Path

1. **Start Simple**: `simple_models_basic.md` (4 steps)
2. **Add Structure**: `simple_models_detailed.md` (decision trees)
3. **Full Features**: `system_core.md` (natural conversation)
4. **Customize**: `clients_platform_specific.md` (platform features)

## 💡 Success Metrics

Your integration is working if:
- ✅ 95%+ of interactions check note types first
- ✅ 100% of new note types ask user permission
- ✅ Users understand what the AI is doing
- ✅ Conversations feel natural and helpful
- ✅ Information gets captured accurately

## 🆘 Need Help?

1. **Read**: `implementation_guide.md` for detailed troubleshooting
2. **Test**: `training_examples.md` for validation scenarios  
3. **Understand**: `_overview.md` for complete system overview
4. **Simplify**: Try a more basic prompt file if current one is too complex

---

**Remember**: All prompts emphasize user permission before creating note types. This is non-negotiable for good user experience.