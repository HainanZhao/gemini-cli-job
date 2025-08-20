# Gemini CLI Job - Development Instructions

This project is a clean, standalone templated job system for AI-powered automation with Gemini CLI.

## Project Overview
- **Clean architecture** - Focused only on templated jobs, no complex hierarchies
- **TypeScript-based** - Strong typing for maintainability  
- **Template-driven** - Reusable job templates with parameters
- **Easy setup** - 1-minute interactive setup wizard

## Key Components
- `src/jobs/templatedJob.ts` - Core templated job system
- `src/utils/` - Logging, configuration, context loading, and notifications
- `scripts/setup.js` - Interactive setup wizard
- `context/` - Context files for different job types

## Development Commands
- `npm run build` - Compile TypeScript
- `npm run dev` - Watch mode for development  
- `npm start` - Run the application
- `npm run setup` - Interactive setup wizard

## Architecture Principles
- Single job type (templated) for simplicity
- Template-based reusability
- Clean separation of concerns
- Minimal dependencies