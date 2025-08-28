import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Comprehensive logging utility with CLI-friendly modes and complete output capture
 */

// Global flag for CLI quiet mode
let isCliMode = false;

// Flag to track if console interception is enabled
let consoleInterceptionEnabled = false;

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
  info: console.info
};

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
    
    // Debug: Also write to a separate debug file to verify writes are happening
    if (process.env.DEBUG_FILE_LOGGING === 'true') {
      const debugFile = logFile.replace('.log', '-debug.log');
      fs.appendFileSync(debugFile, `DEBUG: ${logEntry}`, 'utf8');
    }
  } catch (err) {
    // Silently fail to avoid recursive logging issues
    originalConsole.error(`Failed to write to log file: ${err}`);
  }
}

// Core logging function with consistent formatting
function logWithLevel(level: string, consoleMethod: (...args: any[]) => void, message: string, ...args: any[]): void {
  // Always write to file first
  writeToLogFile(level, message, ...args);
  
  // Output to console based on mode
  if (isCliMode) {
    // Clean output for CLI commands
    consoleMethod(message, ...args);
  } else {
    // Detailed logging for job execution
    const timestamp = new Date().toISOString();
    consoleMethod(`[${timestamp}] [${level}]`, message, ...args);
  }
}

export function setCliMode(enabled: boolean): void {
  isCliMode = enabled;
}

export function log(message: string, ...args: any[]): void {
  logWithLevel('LOG', originalConsole.log, message, ...args);
}

export function error(message: string, ...args: any[]): void {
  const prefix = isCliMode ? 'Error: ' : '';
  logWithLevel('ERROR', originalConsole.error, `${prefix}${message}`, ...args);
}

export function warn(message: string, ...args: any[]): void {
  const prefix = isCliMode ? 'Warning: ' : '';
  logWithLevel('WARN', originalConsole.warn, `${prefix}${message}`, ...args);
}

export function debug(message: string, ...args: any[]): void {
  if (process.env.DEBUG === 'true') {
    logWithLevel('DEBUG', originalConsole.debug, message, ...args);
  }
}

// CLI-specific functions with emojis and formatting
export function cliSuccess(message: string): void {
  writeToLogFile('CLI_SUCCESS', message);
  originalConsole.log(`✅ ${message}`);
}

export function cliInfo(message: string): void {
  writeToLogFile('CLI_INFO', message);
  originalConsole.log(`ℹ️  ${message}`);
}

export function cliError(message: string): void {
  writeToLogFile('CLI_ERROR', message);
  originalConsole.error(`❌ ${message}`);
}

export function cliHeader(message: string): void {
  writeToLogFile('CLI_HEADER', message);
  originalConsole.log(`\n🚀 ${message}`);
  originalConsole.log('='.repeat(message.length + 3));
}

// Job-specific logging
export function logJobExecution(jobName: string, message: string, ...args: any[]): void {
  writeToLogFile('JOB_EXECUTION', `[${jobName}] ${message}`, ...args);
  
  if (isCliMode) {
    originalConsole.log(`🔧 [${jobName}] ${message}`, ...args);
  } else {
    const timestamp = new Date().toISOString();
    originalConsole.log(`[${timestamp}] [JOB] [${jobName}] ${message}`, ...args);
  }
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
          originalConsole.log(`Cleaned up old log file: ${file}`);
        }
      }
    });
  } catch (err) {
    originalConsole.error(`Failed to cleanup old logs: ${err}`);
  }
}

// Console capture system
export function enableConsoleCapture(): void {
  if (consoleInterceptionEnabled) {
    return; // Already enabled
  }
  
  consoleInterceptionEnabled = true;
  
  // Intercept all console methods
  console.log = (...args: any[]) => {
    writeToLogFile('CONSOLE_LOG', '', ...args);
    originalConsole.log(...args);
  };
  
  console.error = (...args: any[]) => {
    writeToLogFile('CONSOLE_ERROR', '', ...args);
    originalConsole.error(...args);
  };
  
  console.warn = (...args: any[]) => {
    writeToLogFile('CONSOLE_WARN', '', ...args);
    originalConsole.warn(...args);
  };
  
  console.debug = (...args: any[]) => {
    writeToLogFile('CONSOLE_DEBUG', '', ...args);
    originalConsole.debug(...args);
  };
  
  console.info = (...args: any[]) => {
    writeToLogFile('CONSOLE_INFO', '', ...args);
    originalConsole.info(...args);
  };
}

export function disableConsoleCapture(): void {
  if (!consoleInterceptionEnabled) {
    return; // Already disabled
  }
  
  consoleInterceptionEnabled = false;
  
  // Restore original console methods
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
}

export function isConsoleCaptureEnabled(): boolean {
  return consoleInterceptionEnabled;
}