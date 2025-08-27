# Gemini CLI Job

**AI-powered automation jobs made simple. Generate reports, release notes, and team updates automatically.**

A clean CLI tool for creating and running automated AI jobs using Google's Gemini. Perfect for teams who want to automate routine documentation and reporting tasks.

## Installation

```bash
npm install -g gemini-cli-job
```

## Quick Start

### 1. Setup (1 minute)

Run the interactive setup wizard:

```bash
gjob setup
```

This will:
- Configure your Google Cloud Project and Gemini model
- Create your first job from built-in templates
- Generate sample template files for customization
- Set up scheduling (optional)

### 2. Customize Template Files

Edit the generated template files in `~/.gemini-cli-job/context/`:

- `about.md` - Your organization/team information
- `products.md` - Your products and services
- `workflows.md` - Your development processes
- `*-rules.md` - Guidelines for different report types

### 3. Run Your First Job

```bash
# Test immediately
gjob run my-project-release-notes

# Or start the scheduler for automatic runs
gjob start
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `gjob setup` | Interactive setup wizard |
| `gjob templates` | Show template directory information |
| `gjob list` | Show configured jobs |
| `gjob run <jobName>` | Run a specific job immediately |
| `gjob start` | Start the job scheduler |

**Global Options:**
- `--config`, `-c` - Path to config.json file (default: ~/.gemini-cli-job/config.json)

**Examples:**
```bash
# Use custom config file
gjob --config /path/to/my-config.json list
gjob -c /path/to/my-config.json run my-job
```

**Command Aliases**: You can use `gjob`, `gemini-job`, or `gemini-cli-job` - they all work the same.

## Features

- 🎯 **4 Built-in Templates** - Release notes, weekly updates, daily standups, custom reports
- 🔧 **1-Minute Setup** - Interactive wizard gets you started instantly
- 📅 **Smart Scheduling** - Cron-based automation with manual override
- � **Context-Aware** - Uses your team info for better AI outputs
- 🔔 **Notifications** - Console output or OpsGenie integration
- ⚡ **Lightweight** - Single purpose, minimal dependencies

## Available Job Templates

| Template | Description | Use Cases |
|----------|-------------|-----------|
| **Release Notes** | Generate project release summaries | Version releases, changelog automation |
| **Weekly Update** | Team activity and progress reports | Team meetings, stakeholder updates |
| **Daily Standup** | Daily team check-ins and blockers | Scrum meetings, remote team coordination |
| **Custom Report** | Flexible reporting with your prompts | Any custom automation need |

## Prerequisites

- **[Gemini CLI](https://github.com/google/gemini-cli)** installed and configured
- **Google Cloud Project** with Gemini API access
- **Node.js 18+**

## Configuration

### Job Configuration

Your jobs are stored in `~/.gemini-cli-job/config.json`. Example:

```json
{
  "googleCloudProject": "your-gcp-project-id",
  "geminiOptions": {
    "model": "gemini-2.0-flash",
    "temperature": 0.7
  },
  "jobs": [
    {
      "jobName": "weekly-team-update",
      "enabled": true,
      "schedules": ["0 17 * * 5"],
      "promptConfig": {
        "contextFiles": ["context/weekly-update-rules.md"],
        "customPrompt": "Focus on engineering team achievements and blockers"
      },
      "geminiOptions": {
        "model": "gemini-2.0-pro",
        "temperature": 0.7
      }
    }
  ]
}
```

#### Multi-Template Support

You can use multiple template files for richer context:

```json
{
  "jobs": [
    {
      "jobName": "comprehensive-report",
      "enabled": true,
      "schedules": ["0 9 * * 1"],
      "promptConfig": {
        "contextFiles": [
          "context/about.md",
          "context/release-notes-rules.md", 
          "context/products.md"
        ],
        "customPrompt": "Generate comprehensive weekly report"
      }
    }
  ]
}
```

#### Gemini Options Configuration

You can configure Google Cloud Project and Gemini model settings globally in your config.json, with optional per-job overrides. Global settings take priority over environment variables, and job-specific settings override global settings:

```json
{
  "googleCloudProject": "your-gcp-project-id",
  "geminiOptions": {
    "model": "gemini-2.0-flash-exp",
    "temperature": 0.7
  },
  "jobs": [
    {
      "jobName": "standard-report",
      "enabled": true,
      "schedules": ["0 9 * * 1"],
      "promptConfig": {
        "contextFiles": ["context/weekly-rules.md"],
        "customPrompt": "Generate weekly report"
      }
    },
    {
      "jobName": "creative-content",
      "enabled": true,
      "schedules": ["0 14 * * 3"],
      "promptConfig": {
        "contextFiles": ["context/content-rules.md"],
        "customPrompt": "Generate creative content"
      },
      "geminiOptions": {
        "temperature": 0.9,
        "maxTokens": 4096
      }
    }
  ]
}
```

Available configuration options:
- `googleCloudProject` - Google Cloud Project ID (overrides `GOOGLE_CLOUD_PROJECT` environment variable)
- `geminiOptions.model` - Gemini model to use (overrides `GEMINI_MODEL` environment variable)
- `geminiOptions.temperature` - Controls randomness (0.0-1.0) *[Note: Currently not supported by Gemini CLI, kept for future compatibility]*
- `geminiOptions.maxTokens` - Maximum tokens to generate *[Note: Currently not supported by Gemini CLI, kept for future compatibility]*

### Environment Variables

Set these in your `.env` file:

```bash
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GEMINI_MODEL=gemini-1.5-flash
OPSGENIE_API_KEY=your-key-here  # Optional, for notifications
```

### Authentication Setup

Before running jobs, ensure proper authentication:

1. **Install Google Cloud CLI**: `gcloud auth application-default login`
2. **Verify project access**: `gcloud config set project your-gcp-project-id`
3. **Enable Gemini API**: Enable the Generative AI API in your Google Cloud project
4. **Test authentication**: `gemini --help` (should work without errors)

**Common authentication issues:**
- `404 Requested entity was not found` → Check project ID and API access
- `Permission denied` → Verify your account has Generative AI permissions
- `Invalid credentials` → Run `gcloud auth application-default login` again

### Template Files

Customize files in `~/.gemini-cli-job/context/` to improve AI output quality:

- **`about.md`** - Your organization, team, mission
- **`products.md`** - Products, services, tech stack  
- **`workflows.md`** - Development processes, tools
- **`*-rules.md`** - Specific formatting rules for each job type

## Usage Examples

### Setup a Release Notes Job

```bash
$ gjob setup
# Choose "Custom Setup"
# Select "Release Notes" template
# Enter your project name
# Set schedule (e.g., "0 9 * * 1" for Monday 9 AM)
```

### Run Jobs

```bash
# Run immediately
gjob run my-project-release-notes

# List all jobs
gjob list

# Start scheduler (runs enabled jobs automatically)
gjob start
```

### Check Templates

```bash
$ gjob list-templates
Available Job Templates:
- release-notes: Release Notes Generator
- weekly-update: Weekly Update Report  
- daily-standup: Daily Standup Summary
- custom-report: Custom Report Generator
```

## Common Use Cases

### Automated Release Notes
- **Schedule**: Monday mornings after deployments
- **Context**: Include product info, release formatting rules
- **Output**: Structured release notes for stakeholders

### Team Weekly Updates  
- **Schedule**: Friday afternoons
- **Context**: Team member info, current project focus
- **Output**: Progress summary for management

### Daily Standup Prep
- **Schedule**: Before daily standups
- **Context**: Sprint goals, team workflows
- **Output**: Formatted updates for each team member

## Troubleshooting

### Job Not Running?
1. Check if job is enabled: `gjob list`
2. Verify environment: Check `.env` file has correct `GOOGLE_CLOUD_PROJECT`
3. Test Gemini CLI: Run `gemini --version` to confirm it's installed

### Poor AI Output Quality?
1. **Update template files** - Add specific info about your team/products
2. **Improve job parameters** - Be more specific in template parameters
3. **Check context loading** - Ensure template files exist and have content

### Scheduling Issues?
1. **Verify cron format** - Use [crontab.guru](https://crontab.guru) to validate
2. **Check timezone** - Schedules use system timezone
3. **Enable jobs** - Make sure `"enabled": true` in config

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/HainanZhao/gemini-cli-job/issues)
- **Discussions**: [Ask questions or share templates](https://github.com/HainanZhao/gemini-cli-job/discussions)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, architecture details, and contribution guidelines.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

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
npm start list
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
      "promptConfig": {
        "contextFiles": "release-notes",
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

### Template Files
Customize template files in `./context/`:
- `about.md` - Organization and team info
- `release-notes-rules.md` - Rules for release notes
- `weekly-update-rules.md` - Rules for weekly updates  
- `daily-standup-rules.md` - Rules for daily standups
- `products.md` - Product information
- `workflows.md` - Team workflows

## Creating Custom Templates

Templates are stored in `~/.gemini-cli-job/context/`. Each template is a JSON file defining:

- **Parameters** - What inputs the template accepts
- **Prompt template** - How to generate the AI prompt
- **Context type** - Which template files to load
- **Output processing** - How to format results
- **Notifications** - Success/error message templates

Example custom template:
```json
{
  "contextFiles": "my-custom-template",
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
│   ├── templateLoader.ts    # Context file loading
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