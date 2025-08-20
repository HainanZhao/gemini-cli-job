# Gemini CLI Job

**Clean, standalone templated job system for AI-powered automation with Gemini CLI.**

A simplified, focused system for creating and running automated AI-powered jobs using Google's Gemini CLI. Perfect for generating reports, release notes, team updates, and custom automations.

## Installation

```bash
npm install -g gemini-cli-job
```

## Quick Start

### Setup

Run the interactive setup wizard to get started quickly:

```bash
gjob setup
```

This will guide you through:
- Environment configuration (Google Cloud Project, Gemini model)
- Job creation with pre-built templates
- Schedule configuration
- **Sample context file generation** in `~/.gemini-cli-job/context/`

### Customizing Context Files

After setup, you'll find sample context files in `~/.gemini-cli-job/context/`:
- `about.md` - Information about your organization/team
- `daily-standup-rules.md` - Daily standup meeting guidelines
- `products.md` - Your products and services information
- `release-notes-rules.md` - Release notes formatting guidelines
- `weekly-update-rules.md` - Weekly update report structure
- `workflows.md` - Your team's development workflows

**Important**: Update these files with your specific information before running jobs for the best results.

### Commands

```bash
# Run setup wizard
gjob setup

# List available job templates
gjob list-templates

# List configured jobs
gjob list-jobs

# Run a specific job immediately
gjob run <jobName>

# Start the job scheduler
gjob start
```

### Available Aliases

You can use any of these commands:
- `gjob` (short)
- `gemini-job` (descriptive)
- `gemini-cli-job` (full name)

## Features

- 🎯 **Template-based jobs** - Reusable job templates with parameters
- 🔧 **Easy setup** - Interactive setup wizard gets you started in 1 minute
- 📅 **Cron scheduling** - Schedule jobs to run automatically
- 🔔 **Multiple notifications** - Console, Opsgenie, or custom integrations
- 🎨 **Flexible contexts** - Customizable context files for different job types
- ⚡ **Fast execution** - Lightweight system focused on templated jobs only

## Prerequisites

1. **[Gemini CLI](https://github.com/google/gemini-cli)** - Ensure the `gemini` command is installed and accessible
2. **Google Cloud Project** - For Gemini API access
3. **Node.js 18+** - For running the job system

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup (1 minute)
```bash
npm run setup
# Choose "Quick Start" → Enter your project details → Done!
```

### 3. Test Your Job
```bash
# Run your job immediately to test
npm start -- --job your-project-release-notes
```

### 4. Enable Scheduling
```bash
# Edit the generated config file and set "enabled": true
# Then start the scheduler
npm start
```

## Available Job Templates

| Template ID | Description | Parameters |
|-------------|-------------|------------|
| `release-notes` | Generate project release summaries | `projectName` |
| `weekly-update` | Team activity reports | `users[]`, `teamName` |
| `daily-standup` | Daily team check-ins | `users[]`, `teamName` |
| `custom-report` | Your own custom automation | `customPrompt`, `focusAreas`, `reportType` |

## Usage Examples

### List Available Templates
```bash
npm start list-templates
```

### List Configured Jobs  
```bash
npm start list-jobs
```

### Run Specific Job
```bash
npm start -- --job my-release-notes
```

### Start Scheduler
```bash
npm start
# Runs all enabled jobs on their schedules
```

## Configuration

### Job Configuration
Jobs are configured in `~/.gemini-cli-job/config.json`:

```json
{
  "jobs": [
    {
      "jobName": "frontend-releases",
      "jobType": "templated", 
      "enabled": true,
      "schedules": ["0 9 * * 1"],
      "templateConfig": {
        "templateId": "release-notes",
        "parameters": {
          "projectName": "frontend-app"
        }
      },
      "notificationConfig": {
        "type": "console",
        "message": "Release Notes: Frontend App",
        "alias": "frontend-releases"
      }
    }
  ]
}
```

### Environment Configuration
Environment variables in `.env`:

```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GEMINI_MODEL=gemini-1.5-flash
JOB_MODE=p
GEMINI_NOTIFICATION_ENABLED=true
OPSGENIE_API_KEY=your-key-here  # Optional
```

### Context Files
Customize context files in `./context/`:
- `about.md` - Organization and team info
- `release-notes-rules.md` - Rules for release notes
- `weekly-update-rules.md` - Rules for weekly updates  
- `daily-standup-rules.md` - Rules for daily standups
- `products.md` - Product information
- `workflows.md` - Team workflows

## Creating Custom Templates

Templates are stored in `~/.gemini-cli-job/templates/`. Each template is a JSON file defining:

- **Parameters** - What inputs the template accepts
- **Prompt template** - How to generate the AI prompt
- **Context type** - Which context files to load
- **Output processing** - How to format results
- **Notifications** - Success/error message templates

Example custom template:
```json
{
  "templateId": "my-custom-template",
  "templateName": "My Custom Report",
  "description": "Generate custom reports",
  "version": "1.0.0",
  "contextType": "custom",
  "promptTemplate": "Generate a {{reportType}} report for {{projectName}}",
  "parameters": {
    "projectName": {
      "type": "string",
      "required": true,
      "description": "Name of the project"
    },
    "reportType": {
      "type": "string", 
      "required": true,
      "validation": {
        "allowedValues": ["weekly", "monthly", "quarterly"]
      }
    }
  }
}
```

## Architecture

This system focuses **only** on templated jobs, making it:
- **Simple** - No complex job type hierarchies
- **Fast** - Minimal overhead and dependencies
- **Maintainable** - Clean, focused codebase
- **Extensible** - Easy to add new templates

## Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
# Watches for changes and rebuilds
```

### Project Structure
```
src/
├── jobs/
│   └── templatedJob.ts     # Core templated job system
├── utils/
│   ├── logger.ts           # Logging utilities
│   ├── envConfigLoader.ts  # Environment configuration
│   ├── contextLoader.ts    # Context file loading
│   ├── geminiCliCore.ts    # Gemini CLI integration
│   └── alertNotifier.ts    # Notification system
└── index.ts                # Main application entry
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.