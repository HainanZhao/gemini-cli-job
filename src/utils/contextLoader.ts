import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { log, error } from './logger';

/**
 * Template Loader
 * Loads template files for different job types
 */
export class ContextLoader {
  private static contextDir = path.join(os.homedir(), '.gemini-cli-job', 'context');

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
}