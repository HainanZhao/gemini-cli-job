import * as fs from 'fs';
import * as path from 'path';
import { log, error } from './logger';

/**
 * Context Loader
 * Loads context files for different job types
 */
export class ContextLoader {
  private static contextDir = path.join(__dirname, '../../context');

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