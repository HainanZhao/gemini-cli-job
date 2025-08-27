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
gjob list
gjob run my-project-release-notes

# Or start the scheduler for automatic runs
gjob start
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `gjob setup` | Interactive setup wizard |
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

- 🎯 **Template-Based Jobs** - Flexible job system using customizable templates
- 🔧 **1-Minute Setup** - Interactive wizard gets you started instantly
- 📅 **Smart Scheduling** - Cron-based automation with manual override
- 📝 **Context-Aware** - Uses your team info for better AI outputs
- 🔔 **Notifications** - Console output or OpsGenie integration
- ⚡ **Lightweight** - Single purpose, minimal dependencies

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
    "model": "gemini-2.0-flash"
  },
  "jobs": [
    {
      "jobName": "weekly-team-update",
      "enabled": true,
      "schedules": ["0 17 * * 5"],
      "promptConfig": {
        "contextFiles": [
          "context/about.md",
          "context/weekly-update-rules.md"
        ],
        "customPrompt": "Focus on engineering team achievements and blockers"
      },
      "geminiOptions": {
        "model": "gemini-2.5-flash"
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
    "model": "gemini-2.0-flash"
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
        "model": "gemini-2.5-flash"
      }
    }
  ]
}
```

Available configuration options:

- `googleCloudProject` - Google Cloud Project ID (overrides `GOOGLE_CLOUD_PROJECT` environment variable)
- `geminiOptions.model` - Gemini model to use (overrides `GEMINI_MODEL` environment variable)

**Note:** Advanced options like temperature and maxTokens are not currently supported by Gemini CLI

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

1. **Update context files** - Add specific info about your team/products
2. **Improve job parameters** - Be more specific in context parameters
3. **Check context loading** - Ensure context files exist and have content

### Scheduling Issues?

1. **Verify cron format** - Use [crontab.guru](https://crontab.guru) to validate
2. **Check timezone** - Schedules use system timezone
3. **Enable jobs** - Make sure `"enabled": true` in config

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/HainanZhao/gemini-cli-job/issues)
- **Discussions**: [Ask questions or share context templates](https://github.com/HainanZhao/gemini-cli-job/discussions)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, architecture details, and contribution guidelines.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

