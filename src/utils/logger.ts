/**
 * Simple logging utility with CLI-friendly modes
 */

// Global flag for CLI quiet mode
let isCliMode = false;

export function setCliMode(enabled: boolean): void {
  isCliMode = enabled;
}

export function log(message: string, ...args: any[]): void {
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
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG]`, message, ...args);
  }
}

// CLI-specific clean output functions
export function cliSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

export function cliInfo(message: string): void {
  console.log(`ℹ️  ${message}`);
}

export function cliError(message: string): void {
  console.error(`❌ ${message}`);
}

export function cliHeader(message: string): void {
  console.log(`\n🚀 ${message}`);
  console.log('='.repeat(message.length + 3));
}