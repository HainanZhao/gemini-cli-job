import { spawn } from 'child_process';
import { log, error } from './logger';

/**
 * Gemini CLI Core Integration
 * Handles execution of Gemini CLI commands
 */
export interface GeminiOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class GeminiCliCore {
  /**
   * Execute Gemini CLI with the provided prompt
   */
  async executeGemini(prompt: string, options: GeminiOptions = {}): Promise<{ stdout: string; stderr: string }> {
    const model = options.model || 'gemini-1.5-flash';
    
    return new Promise((resolve, reject) => {
      log(`Executing Gemini CLI with model: ${model}`);
      
      const args = ['--model', model];
      
      if (options.temperature !== undefined) {
        args.push('--temperature', options.temperature.toString());
      }
      
      const geminiProcess = spawn('gemini', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      geminiProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      geminiProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      geminiProcess.on('close', (code) => {
        if (code === 0) {
          log('Gemini CLI execution completed successfully');
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        } else {
          const errorMessage = `Gemini CLI failed with exit code ${code}: ${stderr}`;
          error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
      
      geminiProcess.on('error', (err) => {
        const errorMessage = `Failed to execute Gemini CLI: ${err.message}`;
        error(errorMessage);
        reject(new Error(errorMessage));
      });
      
      // Send the prompt to stdin
      geminiProcess.stdin?.write(prompt);
      geminiProcess.stdin?.end();
    });
  }
}