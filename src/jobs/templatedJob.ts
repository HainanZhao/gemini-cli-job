import { log, error } from '../utils/logger';
import { GeminiCliCore } from '../utils/geminiCliCore';
import { EnvConfigLoader } from '../utils/envConfigLoader';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Simple Job Configuration
 * Uses a markdown template with optional custom prompt append
 */
export interface SimpleJobConfig {
  jobName: string;
  enabled: boolean;
  schedules: string[];
  
  promptConfig: {
    contextFiles: string[]; // Array of relative paths to markdown templates (e.g., ["context/release-notes-rules.md", "context/about.md"])
    customPrompt?: string; // Optional additional prompt to append
  };
  
  geminiOptions?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * Simple Template Manager
 * Handles loading markdown template files
 */
export class SimpleTemplateManager {
  /**
   * Load template content from array of markdown file paths
   */
  static loadTemplateContent(contextFiles: string[], configDir?: string): string {
    const contents: string[] = [];
    
    for (const file of contextFiles) {
      if (file === 'custom') {
        contents.push('Generate a report based on the following custom requirements:');
        continue;
      }
      
      let templatePath: string;
      if (path.isAbsolute(file)) {
        templatePath = file;
      } else {
        const baseDir = configDir || path.join(os.homedir(), '.gemini-cli-job');
        templatePath = path.join(baseDir, file);
      }
      
      if (fs.existsSync(templatePath)) {
        const content = fs.readFileSync(templatePath, 'utf8');
        contents.push(`\n=== ${path.basename(file)} ===\n${content}`);
      } else {
        throw new Error(`Context file not found: ${templatePath}`);
      }
    }
    
    return contents.join('\n\n').trim();
  }
}

/**
 * Simple Job Runner
 * Executes jobs using markdown templates with optional custom prompts
 */
export async function runSimpleJob(jobConfig: SimpleJobConfig, configDir?: string, globalGeminiOptions?: { model?: string; temperature?: number; maxTokens?: number }, googleCloudProject?: string): Promise<void> {
  const { jobName, promptConfig } = jobConfig;
  
  try {
    // Load environment configuration to ensure Gemini CLI has proper credentials
    const envConfig = EnvConfigLoader.loadEnvConfig();
    log(`Environment loaded: Project=${envConfig.googleCloudProject}, Model=${envConfig.geminiModel}`);
    
    log(`Running Simple Job: ${jobName} using templates: [${promptConfig.contextFiles.join(', ')}]`);
    
    // Load template content from array of files
    const templateContent = SimpleTemplateManager.loadTemplateContent(promptConfig.contextFiles, configDir);
    let prompt = templateContent ? `${templateContent}\n\n` : '';
    
    // Append custom prompt if provided
    if (promptConfig.customPrompt) {
      prompt += promptConfig.customPrompt;
    }
    
    if (!prompt.trim()) {
      throw new Error('No prompt content provided (template or custom prompt required)');
    }
    
    log('Generated prompt for Gemini CLI');
    
    // Execute Gemini CLI with options from config or environment
    const geminiCore = new GeminiCliCore();
    const geminiOptions = {
      ...globalGeminiOptions,
      ...jobConfig.geminiOptions
    };
    const result = await geminiCore.executeGemini(prompt, geminiOptions, googleCloudProject);
    
    // Check if execution was successful (no errors thrown)
    if (result.stdout) {
      log(`Simple Job ${jobName} completed successfully`);
      
      // Show output preview
      const preview = result.stdout.length > 200 ? 
        result.stdout.substring(0, 200) + '...' : 
        result.stdout;
      log(`Generated output preview:\n${preview}`);
      
    } else {
      const errorMsg = `Gemini CLI returned no output. This may indicate:
1. Authentication issues - check if you're logged in with 'gcloud auth application-default login'
2. Project access - verify project '${envConfig.googleCloudProject}' exists and has Gemini API enabled
3. API permissions - ensure your account has Generative AI permissions
      
Stderr: ${result.stderr}`;
      throw new Error(errorMsg);
    }
    
  } catch (err: any) {
    error(`Error running Simple Job ${jobName}:`, err);
    throw err;
  }
}

// Export aliases for backward compatibility
export const JobTemplateManager = SimpleTemplateManager;
export const runTemplatedJob = runSimpleJob;
export type TemplatedJobConfig = SimpleJobConfig;
