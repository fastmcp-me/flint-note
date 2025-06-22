# Template System Documentation

## Overview

jade-note includes a powerful template system that allows you to create structured, consistent notes with variable substitution and predefined sections. Templates help maintain organization and ensure important information is captured systematically.

## How Templates Work

### Template Definition

Templates are defined in the `.description.md` file of each note type under the `## Template (Optional)` section. They use variable substitution syntax with double curly braces: `{{variable_name}}`.

### Available Variables

| Variable | Description | Example Output |
|:---------|:------------|:---------------|
| `{{title}}` | Note title | `# My Note Title` |
| `{{type}}` | Note type name | `general`, `project`, etc. |
| `{{content}}` | User-provided content | User's note content |
| `{{date}}` | Current date | `12/25/2023` (locale-dependent) |
| `{{time}}` | Current time | `2:30:45 PM` (locale-dependent) |
| `{{created}}` | ISO timestamp | `2023-12-25T14:30:45.123Z` |
| `{{updated}}` | ISO timestamp | `2023-12-25T14:30:45.123Z` |

## Using Templates

### Via MCP Tools

#### Creating Notes with Templates

```json
{
  "name": "create_note",
  "arguments": {
    "type": "general",
    "title": "My Template Note",
    "content": "This is the main content of my note.",
    "use_template": true
  }
}
```

#### Getting Template Preview

```json
{
  "name": "get_note_type_template",
  "arguments": {
    "type_name": "general"
  }
}
```

### Template Behavior

- **With `use_template: true`**: Note is created using the template structure with variable substitution
- **With `use_template: false`** (default): Note is created with basic frontmatter + title + content
- **Content Placement**: If template contains `{{content}}`, user content is placed there; otherwise appended at the end

## Example Templates

### Basic Note Template

```markdown
## Template (Optional)
# {{title}}

**Created:** {{date}} at {{time}}
**Type:** {{type}}

## Content
{{content}}

## Actions
- [ ] Review and refine
```

### Project Template

```markdown
## Template (Optional)
# {{title}}

**Project Type:** {{type}}
**Start Date:** {{date}}
**Status:** Planning

## Objective
What is the main goal of this project?

## Scope
{{content}}

## Deliverables
- [ ] Deliverable 1
- [ ] Deliverable 2

## Timeline
- Planning: {{date}}
- Development: TBD
- Launch: TBD

## Resources
- Team members
- Budget requirements
- Tools and technologies

## Notes
Additional project notes and observations.
```

### Meeting Notes Template

```markdown
## Template (Optional)
# {{title}}

**Date:** {{date}}
**Time:** {{time}}
**Type:** {{type}}

## Attendees
- [ ] Person 1
- [ ] Person 2

## Agenda
1. Topic 1
2. Topic 2
3. Topic 3

## Discussion
{{content}}

## Decisions Made
- Decision 1
- Decision 2

## Action Items
- [ ] Task 1 (Assigned to: ___, Due: ___)
- [ ] Task 2 (Assigned to: ___, Due: ___)

## Next Meeting
- Date: ___
- Topics: ___
```

## Creating Custom Note Types with Templates

### Step 1: Create the Note Type

```json
{
  "name": "create_note_type",
  "arguments": {
    "type_name": "meeting",
    "description": "Structured meeting notes with agenda and action items",
    "template": "# {{title}}\n\n**Date:** {{date}}\n**Time:** {{time}}\n\n## Agenda\n\n## Discussion\n{{content}}\n\n## Action Items\n- [ ] "
  }
}
```

### Step 2: Use the Template

```json
{
  "name": "create_note",
  "arguments": {
    "type": "meeting",
    "title": "Weekly Team Sync",
    "content": "Discussed project progress and upcoming milestones.",
    "use_template": true
  }
}
```

## Template Best Practices

### Design Guidelines

1. **Structure**: Use clear section headers (`##`) to organize information
2. **Consistency**: Maintain similar formatting across related note types
3. **Flexibility**: Include optional sections that can be removed if not needed
4. **Action-Oriented**: Include checklist items for follow-up actions
5. **Metadata**: Capture important metadata like dates, statuses, and relationships

### Variable Usage

- Always include `{{title}}` at the beginning
- Use `{{content}}` to position user-provided content appropriately
- Include `{{date}}` and `{{time}}` for temporal context
- Use `{{type}}` to reinforce the note category

### Content Organization

```markdown
# {{title}}                    ← Main title
**Metadata section**           ← Key information at top
## Summary                     ← Brief overview
## Content                     ← Main content area
{{content}}                    ← User content placement
## Analysis/Insights           ← Processing section
## Actions/Next Steps          ← Follow-up items
## Related/References          ← Connections
```

## Error Handling

Templates are designed to be robust:

- **Missing Variables**: Unknown variables like `{{unknown}}` remain unchanged
- **Template Errors**: If template processing fails, notes fall back to basic format
- **Empty Content**: Templates work correctly even with empty user content
- **Invalid Templates**: Malformed templates won't prevent note creation

## Example Output

### Input
```json
{
  "type": "general",
  "title": "Template Demo",
  "content": "This demonstrates how templates work in jade-note.",
  "use_template": true
}
```

### Output
```markdown
---
title: "Template Demo"
type: general
created: 2023-12-25T14:30:45.123Z
updated: 2023-12-25T14:30:45.123Z
tags: []
---

# Template Demo

**Created:** 12/25/2023 at 2:30:45 PM
**Type:** general
**Status:** Draft

## Summary
Quick overview of the note's main points.

## Context
Brief context or background information about this note.

## Content
This demonstrates how templates work in jade-note.

## Key Insights
- Important takeaways
- Notable observations
- Connections to other concepts

## Actions
- [ ] Review and refine content
- [ ] Add relevant tags and links
- [ ] Identify follow-up tasks

## Related Notes
- Links to related notes
- References and sources
- Cross-references

## Tags
Consider adding: #general #notes #draft

---
*Use `use_template: true` when creating notes to apply this structure automatically.*
```

## Integration with Agents

Templates are particularly powerful when used by AI agents because they:

1. **Provide Structure**: Agents can understand the expected format and fill sections appropriately
2. **Ensure Consistency**: All notes of the same type follow the same structure
3. **Guide Content Creation**: Section headers prompt agents to consider different aspects
4. **Support Analysis**: Structured data is easier for agents to process and cross-reference

## Advanced Features

### Conditional Content

While not directly supported by variable substitution, you can design templates that work well with different content lengths:

```markdown
## Summary
{{content}}

## Detailed Analysis
*Expand on the summary above with additional insights.*
```

### Template Inheritance

Create base templates that can be extended:

1. Define a base structure in a common note type
2. Copy and modify for specific use cases
3. Maintain consistency across related note types

### Dynamic Sections

Templates can include optional sections that agents or users can fill as needed:

```markdown
## {{title}} Analysis

### Overview
{{content}}

### Technical Details
*Optional: Add technical specifications*

### Business Impact
*Optional: Describe business implications*

### Next Steps
- [ ] Action item 1
- [ ] Action item 2
```

This template system makes jade-note extremely flexible while maintaining structure and consistency across your knowledge base.