/**
 * Simple logging utility
 */

export function log(message: string, ...args: any[]): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [LOG]`, message, ...args);
}

export function error(message: string, ...args: any[]): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR]`, message, ...args);
}

export function warn(message: string, ...args: any[]): void {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] [WARN]`, message, ...args);
}

export function debug(message: string, ...args: any[]): void {
  if (process.env.DEBUG === 'true') {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG]`, message, ...args);
  }
}