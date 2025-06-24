# Regex Search in flint-note

The flint-note application now supports powerful regex (regular expression) search functionality, allowing users to find notes using complex pattern matching instead of just simple text searches.

## Overview

Regex search enables you to:
- Find structured patterns like emails, phone numbers, dates, URLs
- Use complex matching rules with alternation, quantifiers, and character classes
- Perform case-insensitive matching (default behavior)
- Combine regex patterns with note type filtering
- Get proper relevance scoring with title matches weighted higher than content matches

## Configuration

Regex search is always available and uses default flags for optimal performance:

- **Global matching** (`g`) - Finds all matches, not just the first
- **Case-insensitive** (`i`) - Matches regardless of case

No configuration is required - simply use the `use_regex: true` parameter in search requests.

## Usage

### MCP Tool Interface

The `search_notes` tool now accepts an additional `use_regex` parameter:

```json
{
  "name": "search_notes",
  "arguments": {
    "query": "\\b\\d{4}-\\d{2}-\\d{2}\\b",
    "type_filter": "meetings",
    "limit": 10,
    "use_regex": true
  }
}
```

### Parameters

- `query`: The regex pattern to search for
- `type_filter`: Optional note type to filter by
- `limit`: Maximum number of results to return
- `use_regex`: Boolean flag to enable regex mode (default: `false`)

## Common Regex Patterns

### Email Addresses
```
\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b
```
Finds email addresses like `user@example.com`

### Phone Numbers
```
\b\d{3}-\d{3}-\d{4}\b
```
Finds phone numbers in format `555-123-4567`

### Dates (YYYY-MM-DD)
```
\b\d{4}-\d{2}-\d{2}\b
```
Finds dates like `2024-03-15`

### Function Calls
```
\w+\(\)
```
Finds function calls like `getName()`, `setData()`

### Priority Keywords
```
\b(URGENT|IMPORTANT|HIGH)\b
```
Finds priority markers (case-insensitive by default)

### URLs
```
https?://[^\s]+
```
Finds HTTP and HTTPS URLs

### Hashtags
```
#\w+
```
Finds hashtags like `#project`, `#meeting`

## Scoring System

Regex search uses a weighted scoring system:

- **Title matches**: 10 points
- **Content matches**: 5 points  
- **Tag matches**: 3 points

Notes can accumulate points from multiple match types. Results are sorted by total score (highest first).

## Examples

### Finding All Email Addresses
```javascript
// Search for any email addresses in notes
const results = await searchManager.searchNotes(
  '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
  null,
  10,
  true
);
```

### Finding Meetings with Dates
```javascript
// Find meeting notes that contain dates
const results = await searchManager.searchNotes(
  '\\b\\d{4}-\\d{2}-\\d{2}\\b',
  'meetings',
  5,
  true
);
```

### Finding Action Items
```javascript
// Find notes with TODO items or action verbs
const results = await searchManager.searchNotes(
  '\\b(TODO|FIXME|ACTION|REVIEW)\\b',
  null,
  20,
  true
);
```

## Error Handling

The regex search includes robust error handling:

- **Invalid regex patterns**: Returns descriptive error messages

- **Malformed patterns**: Validates regex syntax before execution
- **Performance limits**: Uses configured flags to prevent runaway regex

## Performance Considerations

- Regex patterns are compiled once per search
- Search operates on the indexed content for better performance
- Complex patterns may be slower than simple text search
- Consider using anchors (`\b`, `^`, `$`) to improve performance

## Comparison with Text Search

| Feature | Text Search | Regex Search |
|---------|-------------|--------------|
| Pattern matching | Exact words | Complex patterns |
| Case sensitivity | Configurable | Via regex flags |
| Performance | Faster | Slower for complex patterns |
| Flexibility | Limited | Very high |
| Learning curve | Easy | Requires regex knowledge |

## Best Practices

1. **Use word boundaries** (`\b`) to avoid partial matches
2. **Escape special characters** when searching for literal text
3. **Test patterns** with simple cases first
4. **Use specific patterns** rather than overly broad ones
5. **Consider performance** for frequently-used searches
6. **Combine with type filtering** to narrow results

## Troubleshooting

### Common Issues

**"Invalid regex pattern" error**
- Check for unescaped special characters: `[`, `(`, `*`, `+`, `?`, `{`, `|`, `^`, `$`
- Ensure brackets and parentheses are properly closed
- Use double backslashes in JSON: `"\\b"` instead of `"\b"`



**No results found**
- Try the pattern with a regex tester first
- Check that notes are indexed (rebuild index if needed)
- Verify the pattern matches your expected format exactly

### Debugging Tips

1. Start with simple patterns and gradually add complexity
2. Use online regex testers to validate patterns
3. Check the snippet in search results to see what was matched
4. Try both with and without word boundaries (`\b`)

## Security Notes

- Regex patterns are validated before execution
- No user code execution - patterns are only used for matching
- Malformed patterns fail safely with descriptive errors
- File system access is restricted to the workspace directory

---

This regex search functionality makes flint-note much more powerful for finding and organizing notes based on structured patterns and complex criteria.