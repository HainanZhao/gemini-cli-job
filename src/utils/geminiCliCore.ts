import { spawn } from 'child_process';
import { log, error, debug } from './logger';

/**
 * Gemini CLI Core Integration
 * Handles execution of Gemini CLI commands
 * 
 * Note: Currently, the Gemini CLI only supports model selection via command line.
 * but are not currently passed to the CLI.
 */
export interface GeminiOptions {
  model?: string;
}

export class GeminiCliCore {
  /**
   * Execute Gemini CLI with the provided prompt
   */
  async executeGemini(prompt: string, options: GeminiOptions = {}, googleCloudProject?: string): Promise<{ stdout: string; stderr: string }> {
    const model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    
    return new Promise((resolve, reject) => {
      log(`Executing job with Gemini model: ${model}`);
      debug(`Prompt length: ${prompt.length} characters`);
      debug(`Google Cloud Project: ${googleCloudProject || process.env.GOOGLE_CLOUD_PROJECT}`);
      
      // Use -m for model only, pass prompt via stdin for better handling of special characters
      const args = ['-m', model];
      debug(`Command: gemini ${args.join(' ')} (prompt via stdin)`);
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        debug('Gemini CLI timeout after 300 seconds, killing process');
        geminiProcess.kill('SIGTERM');
        reject(new Error('Gemini CLI execution timed out after 300 seconds'));
      }, 300_000);
      
      const geminiProcess = spawn('gemini', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: '/tmp', // Use /tmp to avoid loading project context
        env: {
          ...process.env, // Inherit all environment variables
          GOOGLE_CLOUD_PROJECT: googleCloudProject || process.env.GOOGLE_CLOUD_PROJECT,
          GEMINI_MODEL: options.model || process.env.GEMINI_MODEL,
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      geminiProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        debug(`[STDOUT] ${chunk.substring(0, 200)}${chunk.length > 200 ? '...' : ''}`);
        stdout += chunk;
      });
      
      geminiProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        debug(`[STDERR] ${chunk.substring(0, 200)}${chunk.length > 200 ? '...' : ''}`);
        stderr += chunk;
      });
      
      geminiProcess.on('close', (code) => {
        clearTimeout(timeout);
        debug(`Gemini CLI process closed with code: ${code}`);
        if (code === 0) {
          log('✅ Gemini CLI execution completed successfully');
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        } else {
          const errorMessage = `Gemini CLI failed with exit code ${code}: ${stderr}`;
          error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
      
      geminiProcess.on('error', (err) => {
        clearTimeout(timeout);
        const errorMessage = `Failed to execute Gemini CLI: ${err.message}`;
        error(errorMessage);
        reject(new Error(errorMessage));
      });
      
      debug('Gemini CLI process started, waiting for response...');
      
      // Send the prompt to stdin
      geminiProcess.stdin?.write(prompt);
      geminiProcess.stdin?.end();
    });
  }
}