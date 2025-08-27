# Multi-Template Context Files Feature

The `contextFiles` configuration now accepts an array of template files, allowing you to combine multiple context sources for richer AI-generated content.

## Usage

### Single Template
```json
{
  "promptConfig": {
    "contextFiles": ["context/release-notes-rules.md"],
    "customPrompt": "Generate release notes"
  }
}
```

### Multiple Templates
```json
{
  "promptConfig": {
    "contextFiles": [
      "context/about.md",
      "context/release-notes-rules.md",
      "context/products.md"
    ],
    "customPrompt": "Generate comprehensive report"
  }
}
```

## Benefits

1. **Combine Context**: Mix organization info (`about.md`) with specific formatting rules (`*-rules.md`)
2. **Reusability**: Use common templates across different job types
3. **Flexibility**: Include product info, workflows, or team information as needed
4. **Clean Configuration**: Always use arrays for consistency

## File Processing

When using multiple files:
- Files are loaded in the order specified in the array
- Each file is clearly separated with a header: `=== filename.md ===`
- All content is combined before sending to the AI
- Missing files will cause an error (fail-fast approach)

## Examples

### Comprehensive Release Notes
```json
{
  "contextFiles": [
    "context/about.md",           // Company/team context
    "context/products.md",        // Product information
    "context/release-notes-rules.md"  // Formatting rules
  ]
}
```

### Team Updates with Context
```json
{
  "contextFiles": [
    "context/about.md",
    "context/workflows.md",
    "context/weekly-update-rules.md"
  ]
}
```

### Standup with Process Context
```json
{
  "contextFiles": [
    "context/workflows.md",
    "context/daily-standup-rules.md"
  ]
}
```