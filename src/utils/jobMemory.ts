import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { log, error } from './logger';

/**
 * Job Memory Management
 * Provides persistent key-value storage for jobs to maintain state across runs
 */
export class JobMemory {
  private static memoryDir = path.join(os.homedir(), '.gemini-cli-job', 'memory');

  /**
   * Initialize memory directory if it doesn't exist
   */
  private static ensureMemoryDir(): void {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
      log(`Created job memory directory: ${this.memoryDir}`);
    }
  }

  /**
   * Get the memory file path for a specific job
   */
  private static getMemoryFilePath(jobName: string): string {
    this.ensureMemoryDir();
    // Sanitize job name for filename
    const sanitizedJobName = jobName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.memoryDir, `${sanitizedJobName}.memory.json`);
  }

  /**
   * Load memory for a job
   * Returns empty object if memory file doesn't exist
   */
  static async loadJobMemory(jobName: string): Promise<Record<string, any>> {
    try {
      const memoryPath = this.getMemoryFilePath(jobName);
      
      if (!fs.existsSync(memoryPath)) {
        log(`No existing memory found for job: ${jobName}`);
        return {};
      }

      const memoryContent = fs.readFileSync(memoryPath, 'utf8');
      const memory = JSON.parse(memoryContent);
      log(`Loaded memory for job ${jobName}: ${Object.keys(memory).length} entries`);
      return memory;
    } catch (err: any) {
      error(`Failed to load memory for job ${jobName}:`, err.message);
      return {};
    }
  }

  /**
   * Save memory for a job
   */
  static async saveJobMemory(jobName: string, memory: Record<string, any>): Promise<void> {
    try {
      const memoryPath = this.getMemoryFilePath(jobName);
      
      // Add metadata
      const memoryWithMetadata = {
        ...memory,
        _metadata: {
          jobName,
          lastUpdated: new Date().toISOString(),
          updateCount: (memory._metadata?.updateCount || 0) + 1
        }
      };

      fs.writeFileSync(memoryPath, JSON.stringify(memoryWithMetadata, null, 2));
      log(`Saved memory for job ${jobName}: ${Object.keys(memory).length} entries`);
    } catch (err: any) {
      error(`Failed to save memory for job ${jobName}:`, err.message);
      throw err;
    }
  }

  /**
   * Update specific memory values for a job
   */
  static async updateJobMemory(jobName: string, updates: Record<string, any>): Promise<void> {
    const currentMemory = await this.loadJobMemory(jobName);
    const updatedMemory = { ...currentMemory, ...updates };
    await this.saveJobMemory(jobName, updatedMemory);
  }

  /**
   * Get memory file path for a job (for use in prompts)
   */
  static getMemoryFilePathForJob(jobName: string): string {
    return this.getMemoryFilePath(jobName);
  }

  /**
   * Get memory content as formatted string for inclusion in prompts
   */
  static async getMemoryContentForPrompt(jobName: string): Promise<string> {
    const memory = await this.loadJobMemory(jobName);
    
    if (Object.keys(memory).length === 0) {
      return `## Job Memory (${jobName})
No previous memory found. This is the first run or memory was cleared.

Memory file: ${this.getMemoryFilePath(jobName)}

You can update memory by including a "jobMemory" object in your JSON response with key-value pairs. For example:
{
  "jobResult": "Your main response here",
  "jobMemory": {
    "lastUpdatedTime": "2025-08-27T10:30:00Z",
    "lastProcessedVersion": "v1.2.3", 
    "lastCheckpoint": "feature-x-completed",
    "noteForNextRun": "Remember to check the new API endpoints"
  }
}`;
    }

    const memoryEntries = Object.entries(memory)
      .filter(([key]) => !key.startsWith('_')) // Exclude metadata
      .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
      .join('\n');

    return `## Job Memory (${jobName})
Current memory state:
${memoryEntries}

Memory file: ${this.getMemoryFilePath(jobName)}

You can update memory by including a "jobMemory" object in your JSON response with new key-value pairs.
Existing values can be updated or new ones added as needed.`;
  }

  /**
   * Clear memory for a specific job
   */
  static clearJobMemory(jobName: string): void {
    try {
      const memoryPath = this.getMemoryFilePath(jobName);
      if (fs.existsSync(memoryPath)) {
        fs.unlinkSync(memoryPath);
        log(`Cleared memory for job: ${jobName}`);
      }
    } catch (err: any) {
      error(`Failed to clear memory for job ${jobName}:`, err.message);
    }
  }

  /**
   * List all jobs that have memory files
   */
  static listJobsWithMemory(): string[] {
    try {
      this.ensureMemoryDir();
      const files = fs.readdirSync(this.memoryDir);
      return files
        .filter(file => file.endsWith('.memory.json'))
        .map(file => file.replace('.memory.json', '').replace(/_/g, '-'));
    } catch (err: any) {
      error('Failed to list jobs with memory:', err.message);
      return [];
    }
  }

  /**
   * Get memory directory path
   */
  static getMemoryDirectory(): string {
    return this.memoryDir;
  }
}