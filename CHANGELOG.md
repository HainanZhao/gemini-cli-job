# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- markdownlint-disable MD024 -->

## [1.1.4] - 2025-08-29

### Added

- **Environment Variable Config Support** - Added `GJOB_CONFIG_FILE` environment variable for easier configuration management
  - Set custom config file path once via environment variable instead of using `--config` on every command
  - Clear priority order: CLI `--config` option > `GJOB_CONFIG_FILE` env var > default `~/.gemini-cli-job/config.json`
  - Helpful logging shows which config source is being used (CLI, environment, or default)
  - Backwards compatible with existing usage patterns

### Enhanced

- **CLI User Experience** - No need to specify `--config` repeatedly when using custom config locations
- **Configuration Flexibility** - Environment variable provides convenient fallback while CLI option maintains override capability
- **Help Documentation** - Updated help text to show environment variable option: `env: GJOB_CONFIG_FILE`

## [1.1.3] - 2025-08-28

### Changed

- **Logger Code Cleanup** - Significantly refactored logging utility for better maintainability
  - Consolidated duplicate code patterns into single `logWithLevel()` function
  - Eliminated ~50% of redundant code across logging functions
  - Improved consistency in error handling and console method usage
  - Maintained all existing functionality while reducing complexity
  - Better separation between CLI-friendly output and detailed job execution logging

### Technical Improvements

- **DRY Principle Applied** - Removed duplicate implementations across `log()`, `error()`, `warn()`, and `debug()` functions
- **Consistent Error Handling** - Unified use of `originalConsole` methods to prevent recursive logging issues
- **Cleaner Code Structure** - More maintainable codebase with single point of modification for core logging logic

## [1.1.2] - 2025-08-28

### Added

- **File Logging System** - All logs are now automatically saved to date-based files
  - Daily log files stored in `~/.gemini-cli-job/logs/YYYY-MM-DD.log`
  - Comprehensive logging of all console output, debug info, and job execution details
  - Automatic log directory creation and management
  - Silent fallback handling to prevent logging errors from crashing the application

- **Log Management CLI Commands** - New `gjob logs` command with comprehensive options
  - `gjob logs` - Display log information dashboard with recent files
  - `gjob logs --path` - Show log directory path
  - `gjob logs --today` - Show today's log file path
  - `gjob logs --cleanup <days>` - Clean up log files older than specified days

- **Enhanced Logger Functions** - Extended logging capabilities
  - `cliSuccess()`, `cliInfo()`, `cliError()`, `cliHeader()` - CLI-specific formatted output
  - `getLogDirectory()`, `getTodayLogFilePath()` - Utility functions for log management
  - `cleanupOldLogs()` - Automatic cleanup of old log files

### Changed

- **All Log Functions Enhanced** - Every log message now writes to both console and file
  - Maintains existing console behavior while adding persistent file logging
  - Structured log entries with timestamps, levels, and JSON serialization for objects
  - Debug logs only write to file when `DEBUG=true` environment variable is set

## [1.1.1] - 2025-08-27

### Fixed

- **Windows Compatibility** - Fixed `spawn gemini ENOENT` errors on Windows
  - Cross-platform Gemini CLI command detection and execution
  - Shell execution support for proper PATH resolution on Windows
  - Enhanced error messages with platform-specific troubleshooting
  - Simplified spawn configuration following proven working patterns

### Changed

- **Cross-Platform Execution** - Simplified and more reliable Gemini CLI execution across platforms
- **Import Cleanup** - Removed unused imports for cleaner codebase

## [1.1.0] - 2025-08-27

### Added

- **Job Memory System** - Persistent key-value storage for jobs to track state across executions
  - `JobMemory` utility class for loading and saving job-specific memory
  - Memory files stored in `~/.gemini-cli-job/memory/<jobName>.json`
  - Memory content automatically injected into job prompts
  - Support for tracking timestamps, version numbers, counters, and custom state

- **Structured JSON Response System** - Jobs now return structured responses for better automation
  - Gemini AI returns JSON with `jobResult` (main output) and `jobMemory` (state updates)
  - **Robust JSON Parsing** - Handles pure JSON, mixed output with logs, and plain text fallback
  - Multiple parsing strategies for various output formats
  - Graceful error handling with detailed debug logging
  - Automatic fallback to plain text if JSON parsing fails
  - Memory updates handled automatically by the CLI

- **Memory Management CLI Commands**:
  - `gjob memory list` - List all jobs with stored memory
  - `gjob memory show <jobName>` - View memory content for a specific job  
  - `gjob memory clear <jobName>` - Clear stored memory for a job

- **Configurable Job Timeout** - Added `timeoutMs` option to geminiOptions for custom job timeouts
  - Global and per-job timeout configuration support
  - Default timeout remains 300000ms (5 minutes) if not specified
  - Helpful for long-running analysis or complex generation tasks

- **Enhanced Debug Logging** - Comprehensive debug output for troubleshooting
  - Raw Gemini CLI response logging with character counts
  - Full prompt content logging for debugging context issues
  - Platform detection and command execution details
  - Bold formatting for custom prompt instructions to improve AI attention

### Changed

- **Memory Enabled by Default** - All jobs now automatically have persistent memory enabled
- **Removed Configuration Complexity** - No need to set `enableMemory: true` in job configs
- **Enhanced Prompt System** - Memory context and structured response instructions automatically added
- **Job Execution Flow** - Jobs automatically load memory before execution and save memory after completion
- **Error Handling** - Enhanced error handling for memory operations and JSON parsing with graceful fallbacks

### Technical Details

- Memory system uses JSON files for persistence with atomic write operations
- Memory directory is automatically created when needed
- Memory content includes metadata (lastUpdated) for debugging and monitoring
- Full TypeScript support with proper type definitions
- Async memory operations for better performance

## [1.0.1] - 2025-08-27

### Removed

- **Automatic Template Generation** - Removed `generateSampleTemplateFiles()` and `initializeDefaultContexts()` functions that automatically created template files
- **Outdated Documentation** - Removed "Available Job Templates" section from README.md that no longer reflected current functionality
- **Unused CLI Command** - Removed references to `gjob templates` command from documentation

### Changed

- **Template Creation** - Template files are now only created through the explicit `gjob setup` wizard, not automatically when accessing config directories
- **ContextLoader Responsibility** - Simplified ContextLoader class to only load existing context files, not generate them
- **Documentation** - Updated README.md to accurately reflect current CLI commands and configuration options
- **User Experience** - Users must now explicitly run setup wizard to create templates, preventing surprise file generation

### Fixed

- **Documentation Accuracy** - Removed outdated and confusing information about built-in templates and non-existent commands
- **Code Clarity** - Eliminated duplicate template definitions and automatic file generation logic

## [1.0.0] - 2025-08-27

### Added

#### Core Features

- **Templated Job System** - Clean, standalone job execution system focused on AI-powered automation
- **Gemini CLI Integration** - Full integration with Google's Gemini CLI for AI content generation
- **Interactive Setup Wizard** - One-minute setup process via `gjob setup` command
- **Multi-Template Support** - Use multiple context files for richer AI prompts

#### Built-in Job Templates

- **Release Notes Generator** - Automated project release summaries and changelogs
- **Weekly Update Reports** - Team activity and progress reporting
- **Daily Standup Summaries** - Daily team check-ins and blocker identification
- **Custom Report Generator** - Flexible reporting with custom prompts

#### CLI Interface

- **Multiple Command Aliases** - `gjob`, `gemini-job`, and `gemini-cli-job` all work
- **Flexible Configuration** - Support for custom config file paths via `--config` flag
- **Job Management Commands**:
  - `gjob setup` - Interactive setup wizard
  - `gjob list` - Show configured jobs
  - `gjob run <jobName>` - Execute specific jobs
  - `gjob start` - Start the job scheduler
  - `gjob templates` - Show template directory information

#### Configuration System

- **Hierarchical Configuration** - Global settings with per-job overrides
- **Google Cloud Project Integration** - Automatic project ID detection and configuration
- **Gemini Model Selection** - Support for different Gemini models per job
- **Environment Variable Support** - Fallback to environment variables when config values not set
- **Priority Handling** - Config.json values take precedence over environment variables

#### Context and Templating

- **Context File System** - Customizable template files for better AI output:
  - `about.md` - Organization and team information
  - `products.md` - Product and service details
  - `workflows.md` - Development processes and tools
  - `*-rules.md` - Job-specific formatting guidelines
- **Multi-Context Support** - Load multiple context files per job for comprehensive prompts
- **Template Parameter System** - Structured parameter passing to AI prompts

#### Scheduling and Automation

- **Cron-based Scheduling** - Flexible job scheduling using cron expressions
- **Manual Job Execution** - Run jobs immediately for testing or ad-hoc needs
- **Job Enable/Disable** - Granular control over which jobs run automatically

#### Notifications and Output

- **Console Notifications** - Clean, formatted output for job results
- **OpsGenie Integration** - Optional alert notifications for job completion/failure
- **Debug Mode** - Detailed logging when `DEBUG=true` environment variable is set
- **Clean Production Output** - Minimal noise in normal operation

#### Developer Experience

- **TypeScript Support** - Full TypeScript implementation with strong typing
- **Development Mode** - Watch mode for rapid development (`npm run dev`)
- **Global Package Installation** - Install once, use anywhere
- **Comprehensive Documentation** - Detailed README with examples and troubleshooting

#### Error Handling and Reliability

- **Timeout Protection** - 300-second timeout for Gemini CLI operations
- **Process Management** - Proper cleanup of child processes
- **Stdin Prompt Handling** - Robust handling of multi-line prompts via stdin
- **Error Recovery** - Graceful error handling with informative messages

### Technical Implementation

#### Architecture

- **Clean Separation of Concerns** - Modular design with focused utilities
- **Single Job Type Focus** - Simplified architecture concentrating on templated jobs
- **Minimal Dependencies** - Lightweight implementation with essential packages only
- **Process Spawning** - Efficient child process management for CLI integration

#### Dependencies

- **Core Runtime**: Node.js 18+, dotenv, node-cron, yargs
- **Development**: TypeScript, tsx, @types packages
- **External**: Gemini CLI tool for AI integration

#### File Structure

```text
src/
├── jobs/templatedJob.ts     # Core job execution logic
├── utils/
│   ├── geminiCliCore.ts     # Gemini CLI integration
│   ├── logger.ts            # Logging with debug support
│   ├── envConfigLoader.ts   # Configuration management
│   ├── templateLoader.ts    # Context file handling
│   └── alertNotifier.ts     # Notification system
└── index.ts                 # Main CLI application
```

### Changed

- N/A (Initial release)

### Deprecated

- N/A (Initial release)

### Removed

- N/A (Initial release)

### Fixed

- N/A (Initial release)

### Security

- **Environment Variable Handling** - Secure loading of sensitive configuration via dotenv
- **Process Isolation** - Proper child process management for external CLI execution

---

## Release Notes

This initial release establishes Gemini CLI Job as a production-ready solution for AI-powered automation. The focus on templated jobs provides a clean, maintainable foundation that teams can adopt quickly and customize for their specific needs.

### Migration Notes

- This is the initial release - no migration required
- For setup, run `gjob setup` to configure your first automation jobs

### Known Limitations

- Temperature and maxTokens configuration options are defined but not yet supported by Gemini CLI
- Test framework not yet implemented (planned for future release)

### Upcoming Features

- Unit test framework and coverage
- Additional built-in job templates
- Web UI for job configuration and monitoring
- Enhanced notification providers (Slack, Teams, etc.)
- Job history and result storage

---

## Support and Contributing

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/HainanZhao/gemini-cli-job/issues)
- **Discussions**: Ask questions or share templates on [GitHub Discussions](https://github.com/HainanZhao/gemini-cli-job/discussions)
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines

## License

MIT License - see [LICENSE](./LICENSE) file for details.
