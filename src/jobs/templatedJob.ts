import { sendAlert } from '../utils/alertNotifier';
import { log, error } from '../utils/logger';
import { EnvConfigLoader } from '../utils/envConfigLoader';
import { GeminiCliCore } from '../utils/geminiCliCore';
import { ContextLoader } from '../utils/contextLoader';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Job Template Definition
 * Reusable template that can be instantiated with different parameters
 */
export interface JobTemplate {
  templateId: string;
  templateName: string;
  description: string;
  version: string;
  
  // Template configuration
  contextType: 'releaseNotes' | 'weeklyUpdate' | 'dailyStandup' | 'full' | 'custom';
  customContextFiles?: string[];
  promptTemplate: string;
  
  // Template parameters that can be overridden
  parameters: {
    [key: string]: {
      type: 'string' | 'array' | 'object' | 'boolean' | 'number';
      description: string;
      required: boolean;
      defaultValue?: any;
      validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        allowedValues?: any[];
      };
    };
  };
  
  // Data source configuration template
  dataSourceTemplate: {
    type: 'project' | 'users' | 'static' | 'none';
    mapping: Record<string, string>; // Maps template parameters to data source fields
  };
  
  // Output processing template
  outputProcessing: {
    type: 'raw' | 'json' | 'custom';
    jsonPath?: string;
    formatTemplate?: string;
  };
  
  // State management template
  stateManagement?: {
    enabled: boolean;
    stateKeyTemplate: string;
    versionField?: string;
    metaFilePath?: string;
  };
  
  // Notification templates
  notificationTemplate: {
    successMessageTemplate: string;
    errorMessageTemplate: string;
    entityTemplate?: string;
    descriptionTemplate?: string;
  };
}

/**
 * Templated Job Configuration
 * Uses a job template with specific parameter values
 */
export interface TemplatedJobConfig {
  jobName: string;
  jobType: 'templated';
  enabled: boolean;
  schedules: string[];
  
  // Template reference and parameters
  templateConfig: {
    templateId: string; // Reference to job template
    parameters: Record<string, any>; // Values for template parameters
  };
  
  // Standard notification and gemini config (can override template)
  notificationConfig: NotificationConfig;
  geminiConfig?: { model?: string };
}

interface NotificationConfig {
  type: 'console' | 'opsgenie' | 'none';
  message: string;
  alias: string;
  description: string;
  teams: { name: string }[];
  tags: string[];
  details: any;
  entity: string;
  priority: string;
  opsgenieApiKey?: string;
}

/**
 * Job Template Manager
 * Handles loading and validating job templates
 */
export class JobTemplateManager {
  private static templates: Map<string, JobTemplate> = new Map();
  private static templatesDir = path.join(os.homedir(), '.gemini-cli-job', 'templates');

  /**
   * Load all templates from disk or create defaults if none exist
   */
  static async loadTemplates(): Promise<void> {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }

    const templateFiles = fs.readdirSync(this.templatesDir).filter(f => f.endsWith('.json'));
    
    if (templateFiles.length === 0) {
      log('No templates found. Creating default templates...');
      await this.createDefaultTemplates();
      return this.loadTemplates(); // Reload after creating defaults
    }

    for (const file of templateFiles) {
      const templatePath = path.join(this.templatesDir, file);
      const template: JobTemplate = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      this.templates.set(template.templateId, template);
      log(`Loaded template: ${template.templateId}`);
    }
  }

  /**
   * Get a template by ID
   */
  static getTemplate(templateId: string): JobTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * List all available templates
   */
  static listTemplates(): JobTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Create default templates
   */
  private static async createDefaultTemplates(): Promise<void> {
    const defaultTemplates: JobTemplate[] = [
      {
        templateId: 'release-notes',
        templateName: 'Release Notes Generator',
        description: 'Generate release notes for a project since a specific version',
        version: '1.0.0',
        contextType: 'releaseNotes',
        promptTemplate: 'Here are the rules for generating release notes:\\n\\n{{context}}\\n\\nGenerate release notes for project {{projectName}} since version {{lastVersion}} (exclusive), following these rules. Output the result as a JSON array of objects, where each object represents a release and has "tag_name" and "description" fields.',
        parameters: {
          projectName: {
            type: 'string',
            description: 'Name of the project to generate release notes for',
            required: true
          }
        },
        dataSourceTemplate: {
          type: 'project',
          mapping: {
            projectName: 'projectName'
          }
        },
        outputProcessing: {
          type: 'json',
          formatTemplate: '{{#releases}}{{#if description}}- {{description}}\\n{{/if}}{{/releases}}'
        },
        stateManagement: {
          enabled: true,
          stateKeyTemplate: '{{projectName}}',
          versionField: 'tag_name'
        },
        notificationTemplate: {
          successMessageTemplate: 'Release Notes for {{projectName}} - {{currentDate}}',
          errorMessageTemplate: 'Error generating release notes for {{projectName}} - {{currentDate}}',
          entityTemplate: 'Project: {{projectName}}'
        }
      },
      {
        templateId: 'weekly-update',
        templateName: 'Weekly Update Report',
        description: 'Generate weekly update reports for team members',
        version: '1.0.0',
        contextType: 'weeklyUpdate',
        promptTemplate: 'Here are the rules for generating weekly update reports:\\n\\n{{context}}\\n\\nGenerate a consolidated weekly update report for the users (but DO NOT group by the users): {{userList}} for the last 7 days, following the rule: Rules for weekly update reports',
        parameters: {
          users: {
            type: 'array',
            description: 'List of user IDs or emails to include in the report',
            required: true
          },
          teamName: {
            type: 'string',
            description: 'Name of the team',
            required: false,
            defaultValue: 'Team'
          }
        },
        dataSourceTemplate: {
          type: 'users',
          mapping: {
            users: 'userIds'
          }
        },
        outputProcessing: {
          type: 'raw'
        },
        notificationTemplate: {
          successMessageTemplate: 'Weekly Update Report for {{teamName}} - {{currentDate}}',
          errorMessageTemplate: 'Error generating weekly update for {{teamName}} - {{currentDate}}',
          entityTemplate: 'Team: {{teamName}}'
        }
      },
      {
        templateId: 'daily-standup',
        templateName: 'Daily Standup Summary',
        description: 'Generate daily standup summaries for team members',
        version: '1.0.0',
        contextType: 'dailyStandup',
        promptTemplate: 'Here are the rules for daily standup summaries:\\n\\n{{context}}\\n\\nGenerate a daily standup summary for the team members: {{userList}} for today ({{currentDate}}). Focus on what was accomplished yesterday, what is planned for today, and any blockers.',
        parameters: {
          users: {
            type: 'array',
            description: 'List of user IDs or emails to include',
            required: true
          },
          teamName: {
            type: 'string',
            description: 'Name of the team',
            required: false,
            defaultValue: 'Team'
          }
        },
        dataSourceTemplate: {
          type: 'users',
          mapping: {
            users: 'userIds'
          }
        },
        outputProcessing: {
          type: 'raw'
        },
        notificationTemplate: {
          successMessageTemplate: 'Daily Standup Summary for {{teamName}} - {{currentDate}}',
          errorMessageTemplate: 'Error generating daily standup for {{teamName}} - {{currentDate}}',
          entityTemplate: 'Team: {{teamName}}'
        }
      },
      {
        templateId: 'custom-report',
        templateName: 'Custom Report Generator',
        description: 'Generate custom reports with flexible parameters',
        version: '1.0.0',
        contextType: 'custom',
        promptTemplate: 'Generate a {{reportType}} report:\\n\\n{{context}}\\n\\n{{customPrompt}}\\n\\nReport for: {{reportPeriod}}\\nFocus areas: {{focusAreas}}',
        parameters: {
          reportType: {
            type: 'string',
            description: 'Type of report to generate',
            required: true,
            validation: {
              allowedValues: ['monthly', 'weekly', 'quarterly', 'annual', 'custom']
            }
          },
          customPrompt: {
            type: 'string',
            description: 'Custom prompt for the report',
            required: true
          },
          reportPeriod: {
            type: 'string',
            description: 'Time period for the report',
            required: false,
            defaultValue: '{{currentDate}}'
          },
          focusAreas: {
            type: 'string',
            description: 'Areas to focus on in the report',
            required: false,
            defaultValue: 'general activities'
          },
          contextFiles: {
            type: 'array',
            description: 'Custom context files to use',
            required: false,
            defaultValue: ['about.md']
          }
        },
        dataSourceTemplate: {
          type: 'static',
          mapping: {
            reportType: 'reportType',
            customPrompt: 'customPrompt',
            reportPeriod: 'reportPeriod',
            focusAreas: 'focusAreas'
          }
        },
        outputProcessing: {
          type: 'custom',
          formatTemplate: '# {{reportType}} Report - {{reportPeriod}}\\n\\n{{output}}\\n\\n---\\nGenerated on: {{currentDateTime}}'
        },
        notificationTemplate: {
          successMessageTemplate: '{{reportType}} Report Generated - {{reportPeriod}}',
          errorMessageTemplate: 'Failed to generate {{reportType}} report - {{currentDate}}',
          entityTemplate: 'Report: {{reportType}}'
        }
      }
    ];

    for (const template of defaultTemplates) {
      const templateFile = path.join(this.templatesDir, `${template.templateId}.json`);
      fs.writeFileSync(templateFile, JSON.stringify(template, null, 2));
      log(`Created default template: ${template.templateId}`);
    }
  }
}

/**
 * Template variable replacer with parameter validation
 */
class TemplateProcessor {
  private variables: Map<string, any> = new Map();
  
  constructor(
    private template: JobTemplate,
    private parameters: Record<string, any>
  ) {
    // Validate and set parameters with defaults
    this.validateAndSetParameters();
    
    // Set built-in variables
    this.setVariable('currentDate', new Date().toISOString().split('T')[0]);
    this.setVariable('currentDateTime', new Date().toISOString());
  }

  private validateAndSetParameters(): void {
    for (const [paramName, paramDef] of Object.entries(this.template.parameters)) {
      let value = this.parameters[paramName];
      
      // Apply default value if not provided
      if (value === undefined) {
        if (paramDef.required) {
          throw new Error(`Required parameter '${paramName}' not provided`);
        }
        value = paramDef.defaultValue;
      }
      
      // Type validation and conversion
      if (value !== undefined) {
        value = this.validateParameterType(value, paramDef, paramName);
        this.setVariable(paramName, value);
      }
    }
  }

  private validateParameterType(value: any, paramDef: JobTemplate['parameters'][string], paramName: string): any {
    switch (paramDef.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Parameter '${paramName}' must be a string`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Parameter '${paramName}' must be an array`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Parameter '${paramName}' must be a boolean`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`Parameter '${paramName}' must be a number`);
        }
        break;
    }
    
    // Additional validation
    if (paramDef.validation) {
      const validation = paramDef.validation;
      
      if (validation.allowedValues && !validation.allowedValues.includes(value)) {
        throw new Error(`Parameter '${paramName}' must be one of: ${validation.allowedValues.join(', ')}`);
      }
      
      if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
          throw new Error(`Parameter '${paramName}' must be at least ${validation.minLength} characters`);
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          throw new Error(`Parameter '${paramName}' must be at most ${validation.maxLength} characters`);
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          throw new Error(`Parameter '${paramName}' must match pattern: ${validation.pattern}`);
        }
      }
    }
    
    return value;
  }

  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  getVariable(name: string): any {
    return this.variables.get(name);
  }

  process(template: string): string {
    let result = template;
    
    // Replace variables like {{variableName}}
    for (const [name, value] of this.variables) {
      const regex = new RegExp(`{{${name}}}`, 'g');
      let replacementValue: string;
      
      if (Array.isArray(value)) {
        if (name === 'users' || name.includes('user')) {
          // For user arrays, create a user list
          replacementValue = value.join(', ');
          this.setVariable('userList', replacementValue);
        } else {
          replacementValue = value.join(', ');
        }
      } else if (typeof value === 'object') {
        replacementValue = JSON.stringify(value);
      } else {
        replacementValue = String(value);
      }
      
      result = result.replace(regex, replacementValue);
    }
    
    return result;
  }
}

/**
 * Templated Job Runner
 * Executes jobs using predefined templates with parameters
 */
export async function runTemplatedJob(jobConfig: TemplatedJobConfig): Promise<void> {
  const { jobName, templateConfig, notificationConfig } = jobConfig;
  
  try {
    log(`Running Templated Job: ${jobName} using template: ${templateConfig.templateId}`);
    
    // Load template
    const template = JobTemplateManager.getTemplate(templateConfig.templateId);
    if (!template) {
      throw new Error(`Job template '${templateConfig.templateId}' not found`);
    }
    
    // Initialize template processor with parameters
    const templateProcessor = new TemplateProcessor(template, templateConfig.parameters);
    templateProcessor.setVariable('jobName', jobName);
    
    // Step 1: Prepare data source
    await prepareTemplatedDataSource(template, templateProcessor);
    
    // Step 2: Load context
    const contextContent = await loadTemplatedContext(template);
    templateProcessor.setVariable('context', contextContent);
    
    // Step 3: Generate prompt
    const prompt = templateProcessor.process(template.promptTemplate);
    log('Generated prompt for Gemini CLI');
    
    // Step 4: Execute Gemini CLI
    const result = await executeGeminiForJob(prompt, jobConfig);
    
    // Step 5: Process output
    const processedOutput = await processTemplatedOutput(result.stdout, template.outputProcessing, templateProcessor);
    templateProcessor.setVariable('output', processedOutput);
    templateProcessor.setVariable('rawOutput', result.stdout);
    
    // Step 6: Handle state management
    await handleTemplatedStateManagement(template.stateManagement, processedOutput, templateProcessor);
    
    // Step 7: Send success notification
    await sendTemplatedSuccessNotification(jobConfig, template, processedOutput, templateProcessor);
    
    log(`Templated Job ${jobName} completed successfully`);
    
  } catch (err: any) {
    error(`Error running Templated Job ${jobName}:`, err);
    await sendTemplatedErrorNotification(jobConfig, err.message);
  }
}

/**
 * Helper functions for templated jobs
 */

async function prepareTemplatedDataSource(template: JobTemplate, templateProcessor: TemplateProcessor): Promise<void> {
  const { dataSourceTemplate } = template;
  
  switch (dataSourceTemplate.type) {
    case 'project':
      // For project-based data sources, we might need to fetch project info
      // This is where you'd integrate with your project management system
      break;
    case 'users':
      // For user-based data sources, prepare user information
      const users = templateProcessor.getVariable('users');
      if (users) {
        templateProcessor.setVariable('userIds', users);
      }
      break;
    case 'static':
    case 'none':
    default:
      // No additional preparation needed
      break;
  }
}

async function loadTemplatedContext(template: JobTemplate): Promise<string> {
  const { contextType, customContextFiles } = template;
  
  try {
    if (contextType === 'custom' && customContextFiles) {
      return await ContextLoader.loadCustomContext(customContextFiles);
    } else {
      return await ContextLoader.loadContextByType(contextType);
    }
  } catch (err: any) {
    log(`Failed to load context for type '${contextType}', using fallback`);
    return 'Context loading failed. Please ensure context files are available.';
  }
}

async function executeGeminiForJob(prompt: string, jobConfig: TemplatedJobConfig): Promise<{ stdout: string }> {
  const geminiCore = new GeminiCliCore();
  const model = jobConfig.geminiConfig?.model || 'gemini-1.5-flash';
  
  return await geminiCore.executeGemini(prompt, { model });
}

async function processTemplatedOutput(
  rawOutput: string,
  outputConfig: JobTemplate['outputProcessing'],
  templateProcessor: TemplateProcessor
): Promise<string> {
  switch (outputConfig.type) {
    case 'json':
      try {
        const jsonData = JSON.parse(rawOutput);
        templateProcessor.setVariable('jsonData', jsonData);
        
        if (outputConfig.formatTemplate) {
          // Apply formatting template
          return templateProcessor.process(outputConfig.formatTemplate);
        }
        return JSON.stringify(jsonData, null, 2);
      } catch (err) {
        log('Failed to parse JSON output, returning raw output');
        return rawOutput;
      }
    
    case 'custom':
      if (outputConfig.formatTemplate) {
        templateProcessor.setVariable('output', rawOutput);
        return templateProcessor.process(outputConfig.formatTemplate);
      }
      return rawOutput;
    
    case 'raw':
    default:
      return rawOutput;
  }
}

async function handleTemplatedStateManagement(
  stateConfig: JobTemplate['stateManagement'],
  processedOutput: string,
  templateProcessor: TemplateProcessor
): Promise<void> {
  if (!stateConfig?.enabled) return;
  
  const metaFilePath = stateConfig.metaFilePath || path.join(os.homedir(), '.gemini-cli-job', 'job-meta.json');
  const stateKey = templateProcessor.process(stateConfig.stateKeyTemplate);
  
  // Ensure directory exists
  const dir = path.dirname(metaFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Load existing meta
  let meta: any = {};
  if (fs.existsSync(metaFilePath)) {
    meta = JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
  }
  
  // Extract version or update state
  if (stateConfig.versionField) {
    try {
      const jsonData = templateProcessor.getVariable('jsonData');
      if (jsonData && Array.isArray(jsonData) && jsonData.length > 0) {
        const latestVersion = jsonData[0][stateConfig.versionField];
        if (latestVersion) {
          meta[stateKey] = { lastVersion: latestVersion, lastRun: new Date().toISOString() };
          templateProcessor.setVariable('lastVersion', latestVersion);
        }
      }
    } catch (err) {
      log('Failed to extract version from output');
    }
  } else {
    // Update last run time
    meta[stateKey] = { lastRun: new Date().toISOString() };
  }
  
  // Save meta
  fs.writeFileSync(metaFilePath, JSON.stringify(meta, null, 2));
}

async function sendTemplatedSuccessNotification(
  jobConfig: TemplatedJobConfig,
  template: JobTemplate,
  processedOutput: string,
  templateProcessor: TemplateProcessor
): Promise<void> {
  const { notificationConfig } = jobConfig;
  const { notificationTemplate } = template;
  
  // Process notification templates
  const message = templateProcessor.process(notificationTemplate.successMessageTemplate);
  const entity = notificationTemplate.entityTemplate ? 
    templateProcessor.process(notificationTemplate.entityTemplate) : 
    notificationConfig.entity;
  
  const description = notificationTemplate.descriptionTemplate ?
    templateProcessor.process(notificationTemplate.descriptionTemplate) :
    processedOutput.substring(0, 500) + (processedOutput.length > 500 ? '...' : '');
  
  // Send notification
  await sendAlert({
    ...notificationConfig,
    message,
    entity,
    description
  });
}

async function sendTemplatedErrorNotification(
  jobConfig: TemplatedJobConfig,
  errorMessage: string
): Promise<void> {
  const { notificationConfig } = jobConfig;
  
  await sendAlert({
    ...notificationConfig,
    message: `Error in job ${jobConfig.jobName}`,
    description: errorMessage,
    priority: 'P1' // Escalate errors
  });
}