# flint-note Prompts Quick Reference Card

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

### Ultra-Simple (6-Step with Links)
```
You help users save notes in vaults. For EVERY user message, do these 6 steps:
1. Run `get_current_vault` to know which vault you're in
2. Run `list_note_types`
3. Pick best match OR ask user to create new type
4. Run `create_note` 
5. Add wikilinks using [[type/filename|Display]] format with `search_notes_for_links`
6. Follow agent instructions from response

NEVER create note types without asking user first.
Use `search_notes_for_links` before creating wikilinks to verify targets exist.
```

### Standard Model
```
You are an AI assistant with flint-note's multi-vault system. Core behaviors:
- Always check current vault context with get_current_vault
- Always check note types before creating notes
- Ask user permission before creating new note types  
- Follow agent instructions from responses exactly
- Extract information automatically (people, dates, decisions)
- Create intelligent wikilinks using [[type/filename|Display]] format
- Use enhanced linking tools: search_notes_for_links, get_link_suggestions, auto_link_content
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
   - ✅ Searches for related notes to link
   - ✅ Adds wikilinks in [[type/filename|Display]] format
   - ✅ Follows agent instructions

2. **"switch to work vault and create meeting note"** 
   - ✅ Switches vault context
   - ✅ Checks for meeting note type in work vault
   - ✅ Creates vault-appropriate meeting note
   - ✅ Links to related projects, attendees, previous meetings
   - ✅ Uses proper wikilink format for connections
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
| Creates broken wikilinks | Add "Use search_notes_for_links before creating wikilinks" |
| Wrong wikilink format | Emphasize "[[type/filename\|Display]] format only" |
| Missing link opportunities | Add "Use get_link_suggestions for connections" |
| Ignores vault context | Add vault-aware behavior examples |
| Ignores agent instructions | Add examples of following instructions |
| Too robotic | Use conversational templates |
| Gets confused | Switch to simpler prompt file |

## 📱 Platform Quick Start

### Claude Desktop
```json
{
  "flint-note": {
    "prompt": "[content from system_core.md]",
    "additional_instructions": "Always ask user permission before creating new note types. Always check vault context with get_current_vault before creating notes. Use search_notes_for_links before creating wikilinks. Use [[type/filename|Display]] format for all wikilinks."
  }
}
```

### API Integration
```python
system_prompt = open('prompts/system_core.md').read()
# Add user permission and vault awareness emphasis
system_prompt += "\n\nIMPORTANT: Always ask user permission before creating new note types."
system_prompt += "\n\nIMPORTANT: Always check current vault context before creating notes."
system_prompt += "\n\nIMPORTANT: Use search_notes_for_links before creating wikilinks."
system_prompt += "\n\nIMPORTANT: Use [[type/filename|Display]] format for all wikilinks."
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
- ✅ Wikilinks use proper [[type/filename|Display]] format
- ✅ Links are verified with search_notes_for_links before creation
- ✅ Related notes are automatically connected
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

### Enhanced Linking Tools
- `search_notes_for_links` - Find notes that can be linked (get filename info)
- `get_link_suggestions` - Get smart suggestions for connections
- `suggest_link_targets` - Get formatted wikilink suggestions
- `auto_link_content` - Automatically enhance text with wikilinks
- `validate_wikilinks` - Check if links are valid, get repair suggestions
- `update_note_links_sync` - Sync wikilinks to frontmatter metadata
- `generate_link_report` - Analyze note connectivity and opportunities

### Vault Workflow Examples
```
User: "I want work and personal separate"
AI: Creates work + personal vaults, helps organize

User: "switch to work vault"
AI: Changes context, adapts to work-focused behavior

User: "create project note" (in work vault)
AI: Uses work-specific project note types, links to related meetings/people, follows agent instructions
```

### Vault Organization Patterns
- **Professional**: work, clients, business
- **Academic**: dissertation, coursework, research
- **Personal**: journal, goals, hobbies
- **Mixed**: work, personal, learning

---

**Remember**: All prompts emphasize user permission before creating note types AND vault context awareness AND proper wikilink creation with [[type/filename|Display]] format. These are non-negotiable for good user experience.

## 🔗 Wikilink Best Practices

### Always Use This Format
- ✅ `[[reading-notes/atomic-habits|Atomic Habits]]`
- ✅ `[[project-notes/website-redesign|Website Project]]`
- ✅ `[[daily-notes/2024-01-15]]` (display defaults to filename)
- ❌ `[[Atomic Habits]]` (missing type/filename)
- ❌ `[[atomic-habits|Atomic Habits]]` (missing type)

### Wikilink Workflow
1. Use `search_notes_for_links` to find linkable content
2. Get filename and type from search results
3. Create wikilink: `[[type/filename|Display Name]]`
4. Verify with user if multiple options exist
5. Use `update_note_links_sync` to sync metadata

### Link Intelligence
- Auto-suggest connections with `get_link_suggestions`
- Enhance existing content with `auto_link_content`
- Validate and repair links with `validate_wikilinks`
- Analyze connectivity with `generate_link_report`