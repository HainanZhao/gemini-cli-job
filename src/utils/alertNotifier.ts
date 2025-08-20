import { log, error } from './logger';

/**
 * Alert Notifier
 * Handles sending notifications through various channels
 */

export interface AlertConfig {
  type: 'console' | 'opsgenie' | 'none';
  message: string;
  alias: string;
  description?: string;
  teams?: { name: string }[];
  tags?: string[];
  details?: Record<string, any>;
  entity?: string;
  priority?: string;
  opsgenieApiKey?: string;
}

/**
 * Send alert notification
 */
export async function sendAlert(config: AlertConfig): Promise<void> {
  try {
    switch (config.type) {
      case 'console':
        sendConsoleAlert(config);
        break;
      case 'opsgenie':
        await sendOpsgenieAlert(config);
        break;
      case 'none':
        log('Notification disabled, skipping alert');
        break;
      default:
        error(`Unknown notification type: ${config.type}`);
    }
  } catch (err: any) {
    error('Failed to send alert:', err.message);
  }
}

/**
 * Send console alert (for testing/development)
 */
function sendConsoleAlert(config: AlertConfig): void {
  log('=== NOTIFICATION ===');
  log(`Message: ${config.message}`);
  log(`Alias: ${config.alias}`);
  if (config.description) {
    log(`Description: ${config.description}`);
  }
  if (config.entity) {
    log(`Entity: ${config.entity}`);
  }
  if (config.priority) {
    log(`Priority: ${config.priority}`);
  }
  if (config.teams && config.teams.length > 0) {
    log(`Teams: ${config.teams.map(t => t.name).join(', ')}`);
  }
  if (config.tags && config.tags.length > 0) {
    log(`Tags: ${config.tags.join(', ')}`);
  }
  log('===================');
}

/**
 * Send Opsgenie alert
 */
async function sendOpsgenieAlert(config: AlertConfig): Promise<void> {
  // Note: This would require the opsgenie-sdk package
  // For now, we'll just log that we would send an Opsgenie alert
  
  if (!config.opsgenieApiKey) {
    throw new Error('Opsgenie API key is required for Opsgenie notifications');
  }

  log('Would send Opsgenie alert:', {
    message: config.message,
    alias: config.alias,
    description: config.description,
    teams: config.teams,
    tags: config.tags,
    priority: config.priority
  });

  // TODO: Implement actual Opsgenie SDK integration
  // const opsgenie = sdk.configure({
  //   api_key: config.opsgenieApiKey
  // });
  // 
  // await opsgenie.alerts.create({
  //   message: config.message,
  //   alias: config.alias,
  //   description: config.description,
  //   teams: config.teams,
  //   tags: config.tags,
  //   details: config.details,
  //   entity: config.entity,
  //   priority: config.priority
  // });
}