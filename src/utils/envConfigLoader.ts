import * as dotenv from 'dotenv';
import { log, debug } from './logger';

/**
 * Environment Configuration Loader
 * Loads and validates environment variables
 */
export interface EnvConfig {
  jobMode: string;
  googleCloudProject: string;
  geminiModel: string;
  opsgenieApiKey?: string;
  notificationEnabled: boolean;
}

export class EnvConfigLoader {
  /**
   * Load environment configuration from .env file and process.env
   */
  static loadEnvConfig(): EnvConfig {
    // Load .env file
    dotenv.config();
    
    const config: EnvConfig = {
      jobMode: process.env.JOB_MODE || 'p',
      googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || '',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      opsgenieApiKey: process.env.OPSGENIE_API_KEY,
      notificationEnabled: process.env.GEMINI_NOTIFICATION_ENABLED?.toLowerCase() === 'true'
    };

    // Validate required fields
    if (!config.googleCloudProject) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required');
    }

    debug('Environment configuration loaded successfully');
    return config;
  }
}