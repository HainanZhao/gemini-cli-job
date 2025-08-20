import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { log, error } from './logger';

/**
 * Context Loader
 * Loads context files for different job types
 */
export class ContextLoader {
  private static contextDir = path.join(os.homedir(), '.gemini-cli-job', 'context');
  private static builtInContextDir = path.join(__dirname, '../../context');

  /**
   * Load context by type (releaseNotes, weeklyUpdate, etc.)
   */
  static async loadContextByType(contextType: string): Promise<string> {
    const contextFiles = this.getContextFilesForType(contextType);
    return this.loadMultipleContextFiles(contextFiles);
  }

  /**
   * Load custom context files
   */
  static async loadCustomContext(contextFiles: string[]): Promise<string> {
    return this.loadMultipleContextFiles(contextFiles);
  }

  /**
   * Load multiple context files and combine them
   */
  private static async loadMultipleContextFiles(contextFiles: string[]): Promise<string> {
    let combinedContext = '';

    for (const file of contextFiles) {
      try {
        const filePath = path.join(this.contextDir, file);
        
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          combinedContext += `\\n\\n=== ${file} ===\\n${content}`;
          log(`Loaded context file: ${file}`);
        } else {
          log(`Context file not found: ${file}, skipping`);
        }
      } catch (err: any) {
        error(`Failed to load context file ${file}:`, err.message);
      }
    }

    return combinedContext.trim();
  }

  /**
   * Generate sample context files in user's config directory
   */
  static generateSampleContextFiles(): void {
    // Ensure context directory exists
    if (!fs.existsSync(this.contextDir)) {
      fs.mkdirSync(this.contextDir, { recursive: true });
    }

    const sampleContextFiles = {
      'about.md': `# About Your Organization

Add information about your company, team, or project here.
This context will be included in relevant job outputs.

## Company/Team Info
- Name: [Your Company/Team Name]
- Mission: [Your mission statement]
- Key products/services: [Brief description]

## Current Focus
- [Current quarter/sprint goals]
- [Key initiatives]
- [Important deadlines]

Update this file with your specific information.`,

      'daily-standup-rules.md': `# Daily Standup Rules

## Meeting Guidelines
- Keep updates concise (2-3 minutes per person)
- Focus on: what you did yesterday, what you're doing today, any blockers
- Mention dependencies and collaboration needs
- Highlight any urgent issues or deadlines

## Reporting Format
**Yesterday:**
- [Key accomplishments]

**Today:**
- [Planned work]

**Blockers:**
- [Any impediments]

Update these rules to match your team's standup format.`,

      'products.md': `# Products and Services

## Main Products
1. **[Product Name]**
   - Description: [Brief description]
   - Key features: [Main features]
   - Target audience: [Who uses it]

2. **[Product Name]**
   - Description: [Brief description]
   - Key features: [Main features]
   - Target audience: [Who uses it]

## Services
- [Service 1]: [Description]
- [Service 2]: [Description]

## Technology Stack
- Frontend: [Technologies]
- Backend: [Technologies]
- Database: [Technologies]
- Infrastructure: [Cloud/hosting]

Update with your actual products and services.`,

      'release-notes-rules.md': `# Release Notes Guidelines

## Format
### Added
- New features and capabilities

### Changed
- Modifications to existing features

### Fixed
- Bug fixes and issue resolutions

### Removed
- Deprecated or removed features

## Style Guidelines
- Use clear, user-friendly language
- Focus on user impact, not technical details
- Include relevant links or documentation
- Mention breaking changes prominently

## Categories to Include
- User-facing changes
- API changes
- Performance improvements
- Security updates

Customize these rules for your release process.`,

      'weekly-update-rules.md': `# Weekly Update Guidelines

## Report Structure
### Accomplishments
- Major milestones reached
- Key deliverables completed
- Problems solved

### Current Work
- Active projects and tasks
- Progress on ongoing initiatives

### Upcoming
- Next week's priorities
- Upcoming deadlines
- Planned meetings or events

### Challenges
- Blockers or obstacles
- Areas needing support
- Resource constraints

## Audience
- Team members
- Management
- Stakeholders

Adjust the format and content for your team's needs.`,

      'workflows.md': `# Team Workflows

## Development Workflow
1. **Planning**
   - Sprint planning meetings
   - Story pointing and estimation
   - Task assignment

2. **Development**
   - Feature branch creation
   - Code review process
   - Testing requirements

3. **Deployment**
   - CI/CD pipeline
   - Environment promotion
   - Release procedures

## Communication
- Daily standups: [Time and format]
- Sprint reviews: [Frequency and process]
- Retrospectives: [How often and format]

## Tools
- Project management: [Tool name]
- Version control: [Git workflow]
- Communication: [Slack, Teams, etc.]

Update with your actual workflows and processes.`
    };

    // Generate each context file
    Object.entries(sampleContextFiles).forEach(([filename, content]) => {
      const filePath = path.join(this.contextDir, filename);
      
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
        log(`Generated sample context file: ${filename}`);
      } else {
        log(`Context file already exists: ${filename}`);
      }
    });

    log(`Sample context files available in: ${this.contextDir}`);
    log('Please update these files with your specific information before running jobs.');
  }

  /**
   * Get default context files for each job type
   */
  private static getContextFilesForType(contextType: string): string[] {
    const contextMapping: Record<string, string[]> = {
      releaseNotes: ['about.md', 'release-notes-rules.md', 'products.md'],
      weeklyUpdate: ['about.md', 'weekly-update-rules.md', 'workflows.md'],
      dailyStandup: ['about.md', 'daily-standup-rules.md', 'workflows.md'],
      full: ['about.md', 'release-notes-rules.md', 'weekly-update-rules.md', 'daily-standup-rules.md', 'products.md', 'workflows.md'],
      custom: ['about.md']
    };

    return contextMapping[contextType] || ['about.md'];
  }

  /**
   * Initialize context directory with default files if they don't exist
   */
  static async initializeDefaultContext(): Promise<void> {
    if (!fs.existsSync(this.contextDir)) {
      fs.mkdirSync(this.contextDir, { recursive: true });
    }

    const defaultContextFiles = {
      'about.md': `# About

This file should contain information about your organization, team members, and project context.

## Team Members

| Name | GitLab User ID | Email Address |
|------|---------------|---------------|
| Team Member 1 | user1 | user1@company.com |
| Team Member 2 | user2 | user2@company.com |

## Projects

List your main projects and their details here.
`,

      'release-notes-rules.md': `# Release Notes Rules

## Guidelines for Release Notes Generation

- Focus on user-facing changes
- Include new features, bug fixes, and improvements
- Organize by category (Features, Bug Fixes, Improvements)
- Use clear, non-technical language
- Include links to relevant tickets or pull requests
`,

      'weekly-update-rules.md': `# Weekly Update Rules

## Guidelines for Weekly Updates

- Summarize completed work from the past week
- Highlight key achievements and milestones
- List any blockers or challenges
- Mention upcoming priorities for next week
- Include metrics where relevant
`,

      'daily-standup-rules.md': `# Daily Standup Rules

## Guidelines for Daily Standup Summaries

- What was accomplished yesterday
- What is planned for today
- Any blockers or dependencies
- Keep it concise and focused
- Highlight cross-team collaboration
`,

      'products.md': `# Products

List your products, services, and key information here.

## Product 1
- Description
- Key features
- Current version

## Product 2
- Description  
- Key features
- Current version
`,

      'workflows.md': `# Workflows

Document your team's workflows, processes, and standard procedures.

## Development Workflow
1. Create feature branch
2. Implement changes
3. Create merge request
4. Code review
5. Merge to main

## Release Process
1. Prepare release notes
2. Tag release
3. Deploy to staging
4. Test and validate
5. Deploy to production
`
    };

    for (const [filename, content] of Object.entries(defaultContextFiles)) {
      const filePath = path.join(this.contextDir, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
        log(`Created default context file: ${filename}`);
      }
    }
  }
}