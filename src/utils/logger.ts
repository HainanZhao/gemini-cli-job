import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Simple logging utility with CLI-friendly modes and file logging
 */

// Global flag for CLI quiet mode
let isCliMode = false;

// Log directory setup
const LOG_DIR = path.join(os.homedir(), '.gemini-cli-job', 'logs');

// Ensure log directory exists
function ensureLogDirectory(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Get today's log file path
function getTodayLogFile(): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  return path.join(LOG_DIR, `${today}.log`);
}

// Write to log file
function writeToLogFile(level: string, message: string, ...args: any[]): void {
  try {
    ensureLogDirectory();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}${args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : ''}\n`;
    
    const logFile = getTodayLogFile();
    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (err) {
    // Silently fail to avoid recursive logging issues
    console.error(`Failed to write to log file: ${err}`);
  }
}

export function setCliMode(enabled: boolean): void {
  isCliMode = enabled;
}

export function log(message: string, ...args: any[]): void {
  // Write to file first
  writeToLogFile('LOG', message, ...args);
  
  if (isCliMode) {
    // Clean output for CLI commands
    console.log(message, ...args);
  } else {
    // Detailed logging for job execution
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [LOG]`, message, ...args);
  }
}

export function error(message: string, ...args: any[]): void {
  // Write to file first
  writeToLogFile('ERROR', message, ...args);
  
  if (isCliMode) {
    // Clean error output for CLI
    console.error(`Error: ${message}`, ...args);
  } else {
    // Detailed logging for job execution
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR]`, message, ...args);
  }
}

export function warn(message: string, ...args: any[]): void {
  // Write to file first
  writeToLogFile('WARN', message, ...args);
  
  if (isCliMode) {
    // Clean warning output for CLI
    console.warn(`Warning: ${message}`, ...args);
  } else {
    // Detailed logging for job execution
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN]`, message, ...args);
  }
}

export function debug(message: string, ...args: any[]): void {
  if (process.env.DEBUG === 'true') {
    // Write to file first
    writeToLogFile('DEBUG', message, ...args);
    
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG]`, message, ...args);
  }
}

// CLI-specific clean output functions
export function cliSuccess(message: string): void {
  writeToLogFile('CLI_SUCCESS', message);
  console.log(`✅ ${message}`);
}

export function cliInfo(message: string): void {
  writeToLogFile('CLI_INFO', message);
  console.log(`ℹ️  ${message}`);
}

export function cliError(message: string): void {
  writeToLogFile('CLI_ERROR', message);
  console.error(`❌ ${message}`);
}

export function cliHeader(message: string): void {
  writeToLogFile('CLI_HEADER', message);
  console.log(`\n🚀 ${message}`);
  console.log('='.repeat(message.length + 3));
}

// Utility functions for log management
export function getLogDirectory(): string {
  return LOG_DIR;
}

export function getTodayLogFilePath(): string {
  return getTodayLogFile();
}

export function cleanupOldLogs(daysToKeep: number = 30): void {
  try {
    ensureLogDirectory();
    const files = fs.readdirSync(LOG_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    files.forEach(file => {
      if (file.endsWith('.log')) {
        const datePart = file.replace('.log', '');
        const fileDate = new Date(datePart);
        
        if (fileDate < cutoffDate) {
          const filePath = path.join(LOG_DIR, file);
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old log file: ${file}`);
        }
      }
    });
  } catch (err) {
    console.error(`Failed to cleanup old logs: ${err}`);
  }
}