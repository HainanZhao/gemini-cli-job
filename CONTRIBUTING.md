# Contributing to Gemini CLI Job

Thank you for your interest in contributing to Gemini CLI Job! This document provides guidelines for development, testing, and contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- [Gemini CLI](https://github.com/google/gemini-cli) installed
- Google Cloud Project with Gemini API access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HainanZhao/gemini-cli-job.git
   cd gemini-cli-job
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Google Cloud Project details
   ```

### Development Commands

```bash
# Build TypeScript
npm run build

# Development mode (watch for changes)
npm run dev

# Run the application
npm start

# Interactive setup wizard
npm run setup

# Global CLI testing
npm link    # Create global symlink
gjob --help # Test global CLI
```

### VS Code Debugging

The project includes comprehensive VS Code debugging configurations. Use F5 or the Debug panel to run:

#### Available Debug Configurations

1. **Debug gjob run Alice2-release-notes** - Debug the specific Alice2 release notes job
2. **Debug gjob run <custom job>** - Debug any job with input prompt
3. **Debug gjob list-jobs** - Debug job listing functionality
4. **Debug gjob list-templates** - Debug template listing
5. **Debug gjob setup** - Debug the interactive setup wizard
6. **Debug gjob start (scheduler)** - Debug the job scheduler
7. **Debug gjob help** - Debug help command
8. **Debug Built CLI (dist/index.js)** - Debug the compiled version
9. **Debug Specific Template Job** - Debug just the template job execution

#### Quick Start Debugging

1. **Set breakpoints** in your TypeScript source files
2. **Press F5** or use Debug panel → select configuration → Start Debugging
3. **Use the integrated terminal** to see output and interact with prompts
4. **Step through code** with F10 (step over), F11 (step into), Shift+F11 (step out)

#### Custom Job Debugging

Use the "Debug gjob run <custom job>" configuration:
- VS Code will prompt you for the job name
- Enter your job name (e.g., "my-custom-job")
- Debugging will start with that job

#### Environment Variables for Debugging

Debug configurations automatically set:
- `NODE_ENV=development`
- `DEBUG=true` (for detailed logging)

#### TypeScript Source Debugging

The configurations use `ts-node` to debug TypeScript directly:
- No need to compile first for source debugging
- Breakpoints work in `.ts` files
- Source maps automatically resolved

#### Tips for Effective Debugging

- **Use Console Panel**: Switch to Debug Console for REPL
- **Watch Variables**: Add expressions to Watch panel
- **Call Stack**: Navigate through function calls
- **Breakpoint Types**: Use conditional breakpoints for specific scenarios
- **Terminal Integration**: Interactive prompts work in integrated terminal

## Project Architecture

### Design Principles

This system focuses **only** on templated jobs, making it:
- **Simple** - No complex job type hierarchies
- **Fast** - Minimal overhead and dependencies  
- **Maintainable** - Clean, focused codebase
- **Extensible** - Easy to add new templates

### Project Structure

```
src/
├── jobs/
│   └── templatedJob.ts     # Core templated job system
├── utils/
│   ├── logger.ts           # Logging utilities
│   ├── envConfigLoader.ts  # Environment configuration
│   ├── contextLoader.ts    # Context file loading & generation
│   ├── geminiCliCore.ts    # Gemini CLI integration
│   └── alertNotifier.ts    # Notification system
├── index.ts                # Main CLI application entry
└── types/                  # TypeScript type definitions

scripts/
└── setup.js                # Interactive setup wizard

context/
├── about.md                # Sample organization info
├── products.md             # Sample product info
├── workflows.md            # Sample workflow info
└── *-rules.md             # Sample formatting rules
```

### Key Components

#### 1. TemplatedJob System (`src/jobs/templatedJob.ts`)
- Core job execution engine
- Template parameter processing
- Context loading and injection
- Gemini CLI integration
- Result processing and notifications

#### 2. Context Loader (`src/utils/contextLoader.ts`)
- Loads context files by job type
- Generates sample context files for new users
- Combines multiple context files
- Handles missing context gracefully

#### 3. CLI Interface (`src/index.ts`)
- Yargs-based command structure
- Configuration management
- Job scheduling with node-cron
- Global installation support

#### 4. Setup Wizard (`scripts/setup.js`)
- Interactive job configuration
- Environment setup
- Context file generation
- User-friendly onboarding

## Adding New Features

### Adding a New Job Template

1. **Create template definition**
   
   Templates are JSON files stored in `~/.gemini-cli-job/templates/`:

   ```json
   {
     "templateId": "my-new-template",
     "templateName": "My New Template",
     "description": "Description of what this template does",
     "version": "1.0.0",
     "contextType": "custom",
     "promptTemplate": "Generate a {{reportType}} for {{projectName}} focusing on {{focusAreas}}",
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
           "allowedValues": ["summary", "detailed", "brief"]
         }
       },
       "focusAreas": {
         "type": "string",
         "required": false,
         "default": "general progress"
       }
     },
     "outputProcessing": {
       "format": "markdown",
       "sections": ["summary", "details", "next-steps"]
     }
   }
   ```

2. **Add to built-in templates**
   
   Update `src/jobs/templatedJob.ts` to include your template in the default templates:

   ```typescript
   const builtInTemplates = {
     "my-new-template": {
       // Your template definition here
     }
   };
   ```

3. **Update context mappings**
   
   In `src/utils/contextLoader.ts`, add context file mappings:

   ```typescript
   const contextMapping: Record<string, string[]> = {
     // Existing mappings...
     myNewTemplate: ['about.md', 'my-custom-rules.md', 'workflows.md']
   };
   ```

4. **Add setup wizard support**
   
   Update `scripts/setup.js` to include your template in the setup options.

### Adding New CLI Commands

1. **Update main CLI** (`src/index.ts`)
   
   Add new command to the yargs configuration:

   ```typescript
   .command('my-command <param>', 'Description of command', 
     (yargs) => {
       return yargs.positional('param', {
         describe: 'Parameter description',
         type: 'string'
       });
     }, 
     async (argv) => {
       // Command implementation
     }
   )
   ```

2. **Add help documentation**
   
   Ensure your command includes proper help text and examples.

### Adding New Notification Types

1. **Extend AlertNotifier** (`src/utils/alertNotifier.ts`)
   
   Add new notification type:

   ```typescript
   export type NotificationType = 'console' | 'opsgenie' | 'slack' | 'my-new-type';
   
   // Add implementation in sendAlert method
   ```

2. **Update configuration types**
   
   Update TypeScript interfaces to include new notification options.

## Testing

### Manual Testing

1. **Build and link locally**
   ```bash
   npm run build
   npm link
   ```

2. **Test setup in clean environment**
   ```bash
   cd /tmp
   mkdir test-install
   cd test-install
   rm -rf ~/.gemini-cli-job  # Clean slate
   gjob setup
   ```

3. **Test all commands**
   ```bash
   gjob list-templates
   gjob list
   gjob run test-job
   gjob start
   ```

### Testing Context Generation

1. **Remove existing context**
   ```bash
   rm -rf ~/.gemini-cli-job/context
   ```

2. **Test context file creation**
   ```bash
   gjob list-templates  # Should create context files
   ls ~/.gemini-cli-job/context/
   ```

### Testing Configuration

1. **Test with missing config**
   ```bash
   rm ~/.gemini-cli-job/config.json
   gjob list  # Should create default config
   ```

2. **Test environment loading**
   ```bash
   # Test with missing .env
   # Test with invalid GOOGLE_CLOUD_PROJECT
   # Test with missing Gemini CLI
   ```

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use proper error handling with try/catch
- Add JSDoc comments for public methods
- Use descriptive variable and function names

### File Organization

- Keep files focused on single responsibility
- Use consistent naming conventions
- Export interfaces and types from dedicated files
- Group related utilities together

### Error Handling

- Always handle async operations with try/catch
- Use the logger utility for consistent logging
- Provide helpful error messages to users
- Fail gracefully when possible

## Release Process

### Version Updates

1. **Update package.json version**
2. **Update CHANGELOG.md** (if you create one)
3. **Test thoroughly** with `npm link`
4. **Create git tag** matching package version
5. **Push to GitHub** and create release

### Publishing to npm

```bash
npm run build
npm publish
```

### GitHub Release

1. Create release from tag
2. Include changelog in release notes
3. Attach built artifacts if needed

## Documentation

### README Updates

- Keep README focused on user experience
- Include practical examples
- Update command references
- Add troubleshooting for common issues

### Code Documentation

- Add JSDoc for all public APIs
- Include usage examples in comments
- Document complex logic inline
- Keep documentation up to date with code changes

## Community Guidelines

### Issue Reports

- Use provided issue templates
- Include reproduction steps
- Provide environment details
- Add relevant logs or screenshots

### Pull Requests

- Fork the repository
- Create feature branch from `main`
- Write clear commit messages
- Include tests for new features
- Update documentation as needed
- Follow existing code style

### Communication

- Be respectful and constructive
- Ask questions in GitHub Discussions
- Share templates and use cases
- Help other users with issues

## Architecture Decisions

### Why Only Templated Jobs?

This project deliberately focuses on a single job type to:
- Reduce complexity for users and maintainers
- Provide a more polished experience
- Make the codebase easier to understand and contribute to
- Allow for better optimization of the core use case

### Why CLI-First?

The CLI approach provides:
- Easy installation with `npm install -g`
- Familiar interface for developers
- Simple automation and scripting
- Cross-platform compatibility

### Why Context Files?

Context files enable:
- Better AI output quality through relevant context
- Reusable context across multiple jobs
- User customization without code changes
- Separation of content from configuration

## Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Code Review**: Submit PRs for feedback and collaboration

Thank you for contributing to Gemini CLI Job! 🚀