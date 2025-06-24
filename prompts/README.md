# flint-note Prompts Directory

This directory contains all prompt files for flint-note AI integrations, organized by purpose and complexity level.

## 📁 File Organization

### Core System Prompts
- **`system_core.md`** - Main system prompt for standard AI models
- **`instructions_comprehensive.md`** - Detailed behavioral guidelines and advanced features
- **`_overview.md`** - Complete system overview and integration guide

### Simple/Weak Model Support
- **`simple_models_basic.md`** - Ultra-simple 4-step workflow for very weak models
- **`simple_models_detailed.md`** - Step-by-step instructions for moderately weak models
- **`training_examples.md`** - Comprehensive test scenarios and validation examples
- **`implementation_guide.md`** - Complete deployment guide for weak model integrations

### Platform Integration
- **`clients_platform_specific.md`** - Ready-to-use prompts for specific platforms (Claude, VS Code, etc.)

## 🎯 Quick Start Guide

### For Standard AI Models
1. Start with **`system_core.md`** - core behaviors and principles
2. Reference **`instructions_comprehensive.md`** for advanced scenarios
3. Use **`clients_platform_specific.md`** for platform adaptations

### For Weak/Simple AI Models
1. **Very Basic Models**: Use **`simple_models_basic.md`** (4-step workflow)
2. **Moderately Weak Models**: Use **`simple_models_detailed.md`** (detailed procedures)
3. **Training/Validation**: Use **`training_examples.md`** for testing
4. **Implementation**: Follow **`implementation_guide.md`** for deployment

### For Custom Integrations
1. Read **`_overview.md`** for complete system understanding
2. Choose appropriate base prompt from above
3. Customize using **`clients_platform_specific.md`** examples
4. Test with scenarios from **`training_examples.md`**

## 📊 Model Complexity Guide

| Model Capability | Recommended Prompts | Key Features |
|-----------------|-------------------|--------------|
| **GPT-4, Claude 3.5+** | `system_core.md` | Natural conversation, implicit workflow |
| **GPT-3.5, Claude 3** | `system_core.md` + `instructions_comprehensive.md` | Explicit guidance for complex scenarios |
| **Smaller Models** | `simple_models_detailed.md` | Step-by-step procedures, decision trees |
| **Very Basic Models** | `simple_models_basic.md` | Template responses, minimal decisions |

## 🔄 Integration Workflow

### 1. Choose Your Starting Point
```
Standard Model → system_core.md
Weak Model → simple_models_basic.md or simple_models_detailed.md
Custom Platform → clients_platform_specific.md
```

### 2. Test and Validate
```
Use training_examples.md scenarios
Verify core behaviors work correctly
Test error handling and edge cases
```

### 3. Deploy and Monitor
```
Follow implementation_guide.md checklist
Monitor success metrics
Iterate based on user feedback
```

## 🎨 Customization Guidelines

### Adding Domain-Specific Behavior
1. Start with appropriate base prompt
2. Add domain-specific note types and agent instructions
3. Include relevant metadata schemas
4. Test with domain-specific scenarios

### Platform Adaptations  
1. Use `clients_platform_specific.md` as template
2. Adapt for platform-specific features
3. Maintain core flint-note intelligence
4. Test cross-platform compatibility

## 🧪 Testing and Validation

### Required Test Scenarios
Every implementation should pass scenarios from `training_examples.md`:
- ✅ Cold start (no note types exist)
- ✅ Warm system (note types exist)  
- ✅ User permission for new note types
- ✅ Agent instruction following
- ✅ Error handling and recovery

### Success Criteria
- Models follow mandatory workflow steps
- Users give permission before new note types created
- Agent instructions are followed consistently
- Information extraction works accurately
- Conversations feel natural and helpful

## 🔧 Troubleshooting

### Common Issues
- **Model skips note type checking** → Use more explicit prompts
- **Creates note types without permission** → Emphasize user confirmation
- **Ignores agent instructions** → Add explicit examples
- **Poor information extraction** → Include extraction examples
- **Robotic responses** → Use conversational examples

### Getting Help
1. Check `implementation_guide.md` for detailed troubleshooting
2. Review `training_examples.md` for expected behaviors
3. Try simpler prompt if current approach too complex
4. Test incrementally with one feature at a time

## 📈 Evolution and Maintenance

### Regular Updates
- Monitor user feedback across integrations
- Update agent instruction examples based on real usage
- Add new platform examples as needed
- Improve error handling based on common issues

### Contributing
- Follow existing naming conventions
- Test thoroughly before submitting
- Document changes and rationale
- Maintain backward compatibility where possible

## 🏗️ File Naming Convention

- **`system_*`** - Core system prompts for standard models
- **`simple_models_*`** - Prompts for weak/simple models
- **`instructions_*`** - Detailed behavioral guidance
- **`clients_*`** - Platform-specific integrations
- **`training_*`** - Test scenarios and examples
- **`implementation_*`** - Deployment and troubleshooting guides
- **`_overview`** - Meta-documentation (prefixed with underscore)

## 💡 Key Principles

All prompts in this directory follow these core principles:

1. **Agent-First Design** - Users interact through conversation, not UI
2. **Semantic Intelligence** - Note types define behavior through agent instructions
3. **User Permission** - Always ask before creating new note types
4. **Mandatory Workflows** - Consistent steps ensure reliable behavior
5. **Conversational Tone** - Natural, helpful responses that explain actions

Remember: The goal is to create intelligent, personalized note-taking experiences that truly augment human thinking and knowledge work, regardless of the AI model's complexity level.