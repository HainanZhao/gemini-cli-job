import { log, error, debug, logJobExecution } from '../utils/logger';
import { GeminiCliCore } from '../utils/geminiCliCore';
import { EnvConfigLoader } from '../utils/envConfigLoader';
import { JobMemory } from '../utils/jobMemory';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Structured response from Gemini CLI
 */
export interface GeminiJobResponse {
  jobResult: string; // The main output/result of the job
  jobMemory?: Record<string, any>; // Key-value pairs to persist in job memory
}

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
    timeoutMs?: number; // Timeout in milliseconds, defaults to 300000 (5 minutes)
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

  /**
   * Extract JSON object from mixed output text
   * Handles cases where JSON is mixed with other stdout logs
   */
  static extractJsonFromOutput(output: string): any | null {
    debug(`Attempting to extract JSON from output (${output.length} chars)`);
    
    try {
      // First, try parsing the entire output as JSON
      const result = JSON.parse(output.trim());
      debug('Successfully parsed entire output as JSON');
      return result;
    } catch {
      debug('Failed to parse entire output as JSON, trying pattern matching');
      
      // If that fails, try to find JSON within the output
      
      // Look for JSON object patterns (starting with { and ending with })
      const jsonPatterns = [
        // Pattern 1: Look for complete JSON objects with jobResult
        /\{[\s\S]*?"jobResult"[\s\S]*?\}/g,
        // Pattern 2: Look for any complete JSON object
        /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
        // Pattern 3: Look for JSON spanning multiple lines
        /\{[\s\S]*?\}/g
      ];
      
      for (let i = 0; i < jsonPatterns.length; i++) {
        const pattern = jsonPatterns[i];
        const matches = output.match(pattern);
        debug(`Pattern ${i + 1} found ${matches?.length || 0} matches`);
        
        if (matches) {
          for (const match of matches) {
            try {
              const parsed = JSON.parse(match);
              // Validate it looks like our expected structure
              if (parsed && typeof parsed === 'object' && parsed.jobResult) {
                debug('Found valid JSON with jobResult field');
                return parsed;
              }
            } catch {
              // Continue to next match
              continue;
            }
          }
        }
      }
      
      // Try extracting JSON from common log formats
      const lines = output.split('\n');
      debug(`Checking ${lines.length} lines for JSON`);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.includes('jobResult')) {
          try {
            const result = JSON.parse(trimmed);
            debug('Found JSON in single line');
            return result;
          } catch {
            continue;
          }
        }
      }
      
      debug('No valid JSON found in output');
      return null;
    }
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
    logJobExecution(jobName, `Environment loaded: Project=${envConfig.googleCloudProject}, Model=${envConfig.geminiModel}`);
    
    logJobExecution(jobName, `Running job using templates: [${promptConfig.contextFiles.join(', ')}]`);
    
    // Load template content from array of files
    const templateContent = SimpleTemplateManager.loadTemplateContent(promptConfig.contextFiles, configDir);
    let prompt = templateContent ? `${templateContent}\n\n` : '';
    
    // Add memory context (always enabled)
    const memoryContent = await JobMemory.getMemoryContentForPrompt(jobName);
    prompt += `${memoryContent}\n\n`;
    logJobExecution(jobName, 'Added memory context to prompt');
    
    // Append custom prompt if provided
    if (promptConfig.customPrompt) {
      prompt += `\n\n**IMPORTANT CUSTOM INSTRUCTIONS - PLEASE READ CAREFULLY:**\n${promptConfig.customPrompt}\n**END CUSTOM INSTRUCTIONS**`;
      logJobExecution(jobName, 'Added custom prompt instructions');
    }
    
    if (!prompt.trim()) {
      throw new Error('No prompt content provided (template or custom prompt required)');
    }
    
    // Add structured response instruction
    prompt += `\n\n---\n\nIMPORTANT: Return your response as a valid JSON object with this exact structure:
{
  "jobResult": "Your main response/output here",
  "jobMemory": {
    "key1": "value1",
    "key2": "value2"
  }
}

The jobResult should contain the main output (report content, email status, etc.).
The jobMemory should contain key-value pairs to remember for future executions (timestamps, versions, counters, etc.).
If no memory updates are needed, you can omit the jobMemory field or use an empty object {}.

Return ONLY the JSON object, no additional text before or after.`;
    
    logJobExecution(jobName, 'Generated prompt for Gemini CLI');
    
    // Execute Gemini CLI with options from config or environment
    const geminiCore = new GeminiCliCore();
    const geminiOptions = {
      ...globalGeminiOptions,
      ...jobConfig.geminiOptions
    };
    logJobExecution(jobName, `Executing Gemini CLI with model: ${geminiOptions.model || 'default'}`);
    const result = await geminiCore.executeGemini(prompt, geminiOptions, googleCloudProject);
    
    // Check if execution was successful (no errors thrown)
    if (result.stdout) {
      logJobExecution(jobName, `Gemini CLI execution completed successfully, output length: ${result.stdout.length} characters`);
      
      try {
        // Try to extract and parse JSON from the output
        const jsonResult = SimpleTemplateManager.extractJsonFromOutput(result.stdout);
        
        if (jsonResult) {
          // Successfully found and parsed JSON
          const geminiResponse: GeminiJobResponse = jsonResult;
          
          // Validate response structure
          if (!geminiResponse.jobResult) {
            throw new Error('Invalid JSON response: missing jobResult field');
          }
          
          logJobExecution(jobName, `Successfully parsed JSON response, result length: ${geminiResponse.jobResult.length} characters`);
          
          // Display the main job result
          const preview = geminiResponse.jobResult.length > 2000 ? 
            geminiResponse.jobResult.substring(0, 200) + '...' : 
            geminiResponse.jobResult;
          log(`Job Result (from JSON):\n${preview}`);
          
          // Handle memory updates (always enabled)
          const memoryUpdates = {
            // Always add execution metadata
            lastExecutionTime: new Date().toISOString(),
            lastExecutionSuccess: true,
            lastOutputLength: geminiResponse.jobResult.length,
            lastResponseType: 'json',
            // Add any memory updates from Gemini
            ...(geminiResponse.jobMemory || {})
          };
          
          await JobMemory.saveJobMemory(jobName, memoryUpdates);
          logJobExecution(jobName, `Updated memory with ${Object.keys(memoryUpdates).length} keys`);
          
        } else {
          // No valid JSON found, treat as plain text
          logJobExecution(jobName, 'No valid JSON response found, treating entire output as plain text result');
          
          const preview = result.stdout.length > 2000 ? 
            result.stdout.substring(0, 200) + '...' : 
            result.stdout;
          log(`Job Result (plain text):\n${preview}`);
          
          // Update memory with execution metadata (always enabled)
          const memoryUpdates = {
            lastExecutionTime: new Date().toISOString(),
            lastExecutionSuccess: true,
            lastOutputLength: result.stdout.length,
            lastResponseType: 'plain_text'
          };
          await JobMemory.saveJobMemory(jobName, memoryUpdates);
          logJobExecution(jobName, 'Updated memory with execution metadata');
        }
        
      } catch (parseError: any) {
        // Fallback: treat as plain text if JSON parsing fails
        logJobExecution(jobName, `Error processing response: ${parseError.message}`);
        
        const preview = result.stdout.length > 2000 ? 
          result.stdout.substring(0, 200) + '...' : 
          result.stdout;
        log(`Job Result (fallback to plain text):\n${preview}`);
        
        // Update memory with execution metadata (always enabled)
        const memoryUpdates = {
          lastExecutionTime: new Date().toISOString(),
          lastExecutionSuccess: true,
          lastOutputLength: result.stdout.length,
          lastResponseType: 'parse_error',
          lastParseError: parseError.message
        };
        await JobMemory.saveJobMemory(jobName, memoryUpdates);
        logJobExecution(jobName, 'Updated memory with error details');
      }
      
    } else {
      const errorMsg = `Gemini CLI returned no output. This may indicate:
1. Authentication issues - check if you're logged in with 'gcloud auth application-default login'
2. Project access - verify project '${envConfig.googleCloudProject}' exists and has Gemini API enabled
3. API permissions - ensure your account has Generative AI permissions
      
Stderr: ${result.stderr}`;
      
      logJobExecution(jobName, `Gemini CLI execution failed: ${result.stderr || 'No output returned'}`);
      
      // Update memory with failure info (always enabled)
      const memoryUpdates = {
        lastExecutionTime: new Date().toISOString(),
        lastExecutionSuccess: false,
        lastError: result.stderr || 'No output returned'
      };
      await JobMemory.saveJobMemory(jobName, memoryUpdates);
      
      throw new Error(errorMsg);
    }
    
  } catch (err: any) {
    logJobExecution(jobName, `Job execution error: ${err.message}`);
    error(`Error running Simple Job ${jobName}:`, err);
    throw err;
  }
}

// Export aliases for backward compatibility
export const JobTemplateManager = SimpleTemplateManager;
export const runTemplatedJob = runSimpleJob;
export type TemplatedJobConfig = SimpleJobConfig;
