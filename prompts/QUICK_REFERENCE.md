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
You help users save notes in vaults. For EVERY user message, do these 5 steps:
1. Run `get_current_vault` to know which vault you're in
2. Run `list_note_types`
3. Pick best match OR ask user to create new type
4. Run `create_note` 
5. Follow agent instructions from response

NEVER create note types without asking user first.
```

### Standard Model
```
You are an AI assistant with jade-note's multi-vault system. Core behaviors:
- Always check current vault context with get_current_vault
- Always check note types before creating notes
- Ask user permission before creating new note types  
- Follow agent instructions from responses exactly
- Extract information automatically (people, dates, decisions)
- Maintain conversational, helpful tone
- Help users create and switch between vaults for different contexts

[Include full system_core.md content]
```

## 🎯 Key Validation Tests

Test these scenarios with ANY prompt:

1. **"log I'm feeling happy today"**
   - ✅ Checks current vault first
   - ✅ Checks note types
   - ✅ Asks permission to create mood type
   - ✅ Creates note only after permission
   - ✅ Follows agent instructions

2. **"switch to work vault and create meeting note"** 
   - ✅ Switches vault context
   - ✅ Checks for meeting note type in work vault
   - ✅ Creates vault-appropriate meeting note
   - ✅ Follows work-specific agent instructions

3. **"I want separate vaults for work and personal"**
   - ✅ Creates appropriate vaults
   - ✅ Sets up vault-specific contexts
   - ✅ Explains vault organization benefits
   - ✅ Helps user organize existing content

## 🚨 Common Issues & Fixes

| **Problem** | **Quick Fix** |
|------------|---------------|
| Creates notes without checking vault | Add "ALWAYS run get_current_vault first" |
| Creates notes without checking types | Add "ALWAYS run list_note_types after vault check" |
| Creates note types without asking | Add "NEVER create note types without user permission" |
| Ignores vault context | Add vault-aware behavior examples |
| Ignores agent instructions | Add examples of following instructions |
| Too robotic | Use conversational templates |
| Gets confused | Switch to simpler prompt file |

## 📱 Platform Quick Start

### Claude Desktop
```json
{
  "jade-note": {
    "prompt": "[content from system_core.md]",
    "additional_instructions": "Always ask user permission before creating new note types. Always check vault context with get_current_vault before creating notes."
  }
}
```

### API Integration
```python
system_prompt = open('prompts/system_core.md').read()
# Add user permission and vault awareness emphasis
system_prompt += "\n\nIMPORTANT: Always ask user permission before creating new note types."
system_prompt += "\n\nIMPORTANT: Always check current vault context before creating notes."
```

## 🔄 Upgrade Path

1. **Start Simple**: `simple_models_basic.md` (4 steps)
2. **Add Structure**: `simple_models_detailed.md` (decision trees)
3. **Full Features**: `system_core.md` (natural conversation)
4. **Customize**: `clients_platform_specific.md` (platform features)

## 💡 Success Metrics

Your integration is working if:
- ✅ 95%+ of interactions check vault context first
- ✅ 95%+ of interactions check note types after vault check
- ✅ 100% of new note types ask user permission
- ✅ Vault switching works smoothly
- ✅ Users understand what the AI is doing
- ✅ Conversations feel natural and helpful
- ✅ Information gets captured accurately in correct vaults

## 🆘 Need Help?

1. **Read**: `implementation_guide.md` for detailed troubleshooting
2. **Test**: `training_examples.md` for validation scenarios  
3. **Understand**: `_overview.md` for complete system overview
4. **Simplify**: Try a more basic prompt file if current one is too complex

## 🏗️ Multi-Vault Quick Start

### Essential Vault Tools
- `list_vaults` - Show all configured vaults
- `get_current_vault` - Check which vault is active
- `create_vault` - Create new vault for different context
- `switch_vault` - Change to different vault
- `update_vault` - Modify vault name/description
- `remove_vault` - Remove vault (files preserved)

### Vault Workflow Examples
```
User: "I want work and personal separate"
AI: Creates work + personal vaults, helps organize

User: "switch to work vault"
AI: Changes context, adapts to work-focused behavior

User: "create project note" (in work vault)
AI: Uses work-specific project templates and agent instructions
```

### Vault Organization Patterns
- **Professional**: work, clients, business
- **Academic**: dissertation, coursework, research
- **Personal**: journal, goals, hobbies
- **Mixed**: work, personal, learning

---

**Remember**: All prompts emphasize user permission before creating note types AND vault context awareness. Both are non-negotiable for good user experience.