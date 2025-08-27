import { spawn } from 'child_process';
import { log, error, debug } from './logger';
import * as os from 'os';

/**
 * Gemini CLI Core Integration
 * Handles execution of Gemini CLI commands
 * 
 * Note: Currently, the Gemini CLI only supports model selection via command line.
 * but are not currently passed to the CLI.
 */
export interface GeminiOptions {
  model?: string;
  timeoutMs?: number; // Timeout in milliseconds, defaults to 300000 (5 minutes)
}

export class GeminiCliCore {
  /**
   * Execute Gemini CLI with the provided prompt
   */
  async executeGemini(prompt: string, options: GeminiOptions = {}, googleCloudProject?: string): Promise<{ stdout: string; stderr: string }> {
    const model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const timeoutMs = options.timeoutMs || 300_000; // Default to 5 minutes
    
    return new Promise((resolve, reject) => {
      log(`Executing job with Gemini model: ${model}`);
      debug(`Platform: ${os.platform()}`);
      debug(`Prompt length: ${prompt.length} characters`);
      debug(`Timeout set to: ${timeoutMs}ms (${timeoutMs / 1000}s)`);
      debug(`Google Cloud Project: ${googleCloudProject || process.env.GOOGLE_CLOUD_PROJECT}`);
      
      // Debug: Print the full context template content
      debug('=== FULL PROMPT CONTENT ===');
      debug(prompt);
      debug('=== END PROMPT CONTENT ===');
      
      // Use -m for model selection
      const args = ['-m', model];
      debug(`Command: gemini ${args.join(' ')} (prompt via stdin)`);
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        debug(`Gemini CLI timeout after ${timeoutMs}ms, killing process`);
        geminiProcess.kill('SIGTERM');
        reject(new Error(`Gemini CLI execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      const geminiProcess = spawn('gemini', args, {
        stdio: 'pipe',
        shell: process.platform === 'win32',
        env: {
          ...process.env, // Inherit all environment variables
          GOOGLE_CLOUD_PROJECT: googleCloudProject || process.env.GOOGLE_CLOUD_PROJECT,
          GEMINI_MODEL: options.model || process.env.GEMINI_MODEL,
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      geminiProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        debug(`[STDOUT] ${chunk.substring(0, 200)}${chunk.length > 200 ? '...' : ''}`);
        stdout += chunk;
      });
      
      geminiProcess.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        debug(`[STDERR] ${chunk.substring(0, 200)}${chunk.length > 200 ? '...' : ''}`);
        stderr += chunk;
      });
      
      geminiProcess.on('close', (code: number | null) => {
        clearTimeout(timeout);
        debug(`Gemini CLI process closed with code: ${code}`);
        
        // Debug: Log the raw response
        debug('=== RAW GEMINI CLI RESPONSE ===');
        debug(`STDOUT (${stdout.length} chars):`);
        debug(stdout);
        debug(`STDERR (${stderr.length} chars):`);
        debug(stderr);
        debug('=== END RAW RESPONSE ===');
        
        if (code === 0) {
          log('✅ Gemini CLI execution completed successfully');
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        } else {
          const errorMessage = `Gemini CLI failed with exit code ${code}: ${stderr}`;
          error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
      
      geminiProcess.on('error', (err: Error) => {
        clearTimeout(timeout);
        let errorMessage = `Failed to execute Gemini CLI: ${err.message}`;
        
        // Provide helpful error messages for common issues
        if (err.message.includes('ENOENT')) {
          errorMessage += `

Possible solutions:
1. Install Gemini CLI: npm install -g @google/gemini-cli
2. Verify Gemini CLI is in PATH: try running 'gemini --help' in terminal
3. On Windows: ensure Node.js and npm are properly installed
4. Restart terminal after installation to refresh PATH

Platform: ${os.platform()}
Command attempted: gemini ${args.join(' ')}`;
        }
        
        error(errorMessage);
        reject(new Error(errorMessage));
      });
      
      debug('Gemini CLI process started, waiting for response...');
      
      // Send the prompt to stdin
      debug(`Sending prompt (${prompt.length} characters)...`);
      geminiProcess.stdin?.write(prompt);
      geminiProcess.stdin?.end();
    });
  }
}