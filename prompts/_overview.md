# flint-note Prompt System Overview

This document explains how the flint-note prompt files work together to provide consistent, intelligent assistance across different platforms and use cases.

## File Structure and Purpose

### 1. `system_core.md` - Core System Prompt
**Purpose**: The main, concise system prompt for AI assistants interacting with flint-note.
**Use**: Primary prompt for most integrations and general-purpose flint-note assistance.
**Key Features**:
- Conversational, agent-first approach
- Core behaviors and responsibilities
- Essential tool usage
- Success metrics

### 2. `instructions_comprehensive.md` - Comprehensive Behavioral Guide
**Purpose**: Detailed instructions for AI behavior, covering all aspects of flint-note interaction.
**Use**: Reference guide for complex scenarios, training, and advanced integrations.
**Key Features**:
- Complete MCP tool usage guide
- Advanced behavioral patterns
- Error handling strategies
- Pattern recognition and workflow optimization

### 3. `clients_platform_specific.md` - Platform-Specific Integration Prompts
**Purpose**: Ready-to-use prompts tailored for specific platforms and domains.
**Use**: Quick setup for Claude Desktop, VS Code, Obsidian, Slack, and custom applications.
**Key Features**:
- Platform-specific adaptations
- Domain-specialized configurations
- Testing scenarios
- Troubleshooting guides

## How They Work Together

### Hierarchical Structure
```
system_core.md (Core principles and behaviors)
    ↓
instructions_comprehensive.md (Detailed implementation)
    ↓
clients_platform_specific.md (Platform-specific adaptations)
```

### Information Flow
1. **Start with system_core.md** for basic flint-note behavior
2. **Reference instructions_comprehensive.md** for detailed guidance on complex scenarios
3. **Use clients_platform_specific.md** for platform-specific modifications and examples

## Key Concepts Across All Files

### Agent Instructions System
The foundation of flint-note's intelligence:
- **Note types define behavior** through agent instructions
- **Agent instructions guide AI responses** contextually
- **Continuous improvement** through agent instruction evolution
- **Personalization** based on user patterns and feedback

### Essential Workflow Pattern
1. **Use `get_note_type_info`** to understand current agent instructions
2. **Create notes** following note type-specific behaviors
3. **Follow `agent_instructions`** returned from `create_note` responses
4. **Use `update_note_type`** to refine agent instructions based on feedback

### Metadata Schema Integration
- **Structured data validation** for enhanced organization
- **Automatic population** from conversation content
- **Schema evolution** based on usage patterns
- **Cross-platform compatibility** through standardized schemas

## Implementation Guide

### For Simple Integrations
Use `system_core.md` directly:
```
You have access to flint-note, an intelligent note-taking system...
[Include the core behaviors and essential tools section]
```

### For Advanced Integrations
Combine `system_core.md` with relevant sections from `instructions_comprehensive.md`:
- Add specific tool usage patterns
- Include error handling strategies
- Implement advanced behavioral patterns

### For Platform-Specific Integrations
Start with appropriate template from `clients_platform_specific.md`:
- Modify for your specific platform requirements
- Add domain-specific note types and agent instructions
- Test with provided validation scenarios

## Common Integration Patterns

### 1. General Purpose Assistant
**Files**: `system_core.md`
**Features**: Core flint-note functionality, conversational interface
**Best for**: Personal knowledge management, general note-taking

### 2. Professional/Team Environment
**Files**: `system_core.md` + `instructions_comprehensive.md` (workflow optimization sections)
**Features**: Advanced pattern recognition, team collaboration features
**Best for**: Business environments, team knowledge bases

### 3. Domain-Specific Application
**Files**: All three, with heavy customization from `clients_platform_specific.md`
**Features**: Specialized note types, domain-specific agent instructions
**Best for**: Healthcare, legal, technical documentation, education

### 4. Platform Integration
**Files**: `clients_platform_specific.md` template + `system_core.md` core behaviors
**Features**: Platform-specific adaptations while maintaining core intelligence
**Best for**: Obsidian, Notion, Slack, VS Code integrations

## Customization Guidelines

### Modifying Core Behaviors
1. **Start with system_core.md** as your base
2. **Add specific behaviors** from instructions_comprehensive.md as needed
3. **Test thoroughly** with validation scenarios from clients_platform_specific.md

### Adding Domain Expertise
1. **Use clients_platform_specific.md examples** as templates
2. **Define domain-specific note types** with appropriate agent instructions
3. **Create metadata schemas** that support your domain's needs
4. **Test with domain-specific scenarios**

### Platform Adaptations
1. **Choose appropriate clients_platform_specific.md template**
2. **Modify for your platform's specific requirements**
3. **Maintain flint-note core intelligence**
4. **Test cross-platform compatibility**

## Validation and Testing

### Basic Functionality Tests
- Agent instruction workflow (create, follow, update)
- Metadata schema validation
- Knowledge discovery and search
- Pattern recognition and suggestions

### Integration Tests
- Platform-specific features work correctly
- Core flint-note behaviors maintained
- Error handling functions properly
- Performance meets requirements

### User Experience Tests
- Conversations feel natural and helpful
- Information capture is effortless
- System becomes more personalized over time
- Users spend time thinking, not organizing

## Maintenance and Evolution

### Regular Updates
1. **Monitor user feedback** across all integrations
2. **Update agent instruction examples** based on real usage
3. **Add new platform templates** as needed
4. **Improve error handling** based on common issues

### Version Compatibility
- **Maintain backward compatibility** in core prompts
- **Document breaking changes** clearly
- **Provide migration guides** for major updates
- **Test across all supported platforms**

### Community Contributions
- **Accept platform-specific templates** from community
- **Validate contributed prompts** against core principles
- **Maintain quality standards** across all prompt files
- **Document integration patterns** as they emerge

## Best Practices

### For Prompt Developers
1. **Understand the agent instructions system** before customizing
2. **Test with real scenarios** from your target domain
3. **Maintain conversational tone** in all interactions
4. **Focus on user value** over technical features
5. **Use the organized prompts directory** for consistent file management

### For Integration Developers
1. **Start with existing templates** rather than building from scratch
2. **Test thoroughly** with provided validation scenarios
3. **Document your customizations** for future maintenance
4. **Contribute improvements** back to the community

### For End Users
1. **Start with system_core.md** for general understanding
2. **Use clients_platform_specific.md** for platform-specific setup
3. **Refer to instructions_comprehensive.md** for advanced features
4. **Check the prompts directory README** for the latest organization
5. **Provide feedback** to improve the system over time

## Conclusion

The flint-note prompt system is designed to be:
- **Modular**: Use only what you need
- **Extensible**: Easy to customize for specific needs
- **Consistent**: Core intelligence maintained across platforms
- **Evolutionary**: Improves through usage and feedback

By understanding how these files work together, you can create intelligent, personalized note-taking experiences that truly augment human thinking and knowledge work.

The key to success is starting with the core principles in system_core.md, understanding the detailed behaviors in instructions_comprehensive.md, and adapting appropriately using clients_platform_specific.md templates - all while maintaining the agent-first, conversational approach that makes flint-note unique.

> 📁 **Note**: All prompt files have been organized into the `prompts/` directory with consistent naming. See `prompts/README.md` for the complete file organization and quick start guide.