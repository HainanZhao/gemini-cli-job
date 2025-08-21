#!/usr/bin/env node
import * as cron from 'node-cron';
import { log, error, setCliMode, cliSuccess, cliInfo, cliError, cliHeader } from './utils/logger';
import { runTemplatedJob, TemplatedJobConfig, JobTemplateManager } from './jobs/templatedJob';
import { EnvConfigLoader } from './utils/envConfigLoader';
import { ContextLoader } from './utils/contextLoader';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface Config {
  jobs: TemplatedJobConfig[];
}

const configPath = path.join(os.homedir(), '.gemini-cli-job', 'config.json');

async function loadConfigurationQuietly(): Promise<Config> {
  try {
    // Load environment configuration (quietly)
    const envConfig = EnvConfigLoader.loadEnvConfig();
    
    // Ensure config directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      ContextLoader.generateSampleContextFiles();
    }

    // Load JSON configuration or create default
    let config: Config;
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      config = { jobs: [] };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
    
    // Apply environment config as fallbacks
    config.jobs = config.jobs.map(job => {
      if (!job.geminiConfig?.model || job.geminiConfig.model === '') {
        job.geminiConfig = { 
          ...job.geminiConfig, 
          model: envConfig.geminiModel 
        };
      }
      
      if (envConfig.opsgenieApiKey && !job.notificationConfig.opsgenieApiKey) {
        job.notificationConfig.opsgenieApiKey = envConfig.opsgenieApiKey;
      }
      
      return job;
    });
    
    return config;
  } catch (err: any) {
    throw new Error(`Failed to load configuration: ${err.message}`);
  }
}

async function loadConfiguration(): Promise<Config> {
  try {
    // Load environment configuration first
    const envConfig = EnvConfigLoader.loadEnvConfig();
    log('Environment configuration loaded:', envConfig);
    
    // Ensure config directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      // Generate sample context files for new installations
      ContextLoader.generateSampleContextFiles();
    }

    // Load JSON configuration or create default
    let config: Config;
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      log('No configuration file found. Creating default configuration...');
      config = { jobs: [] };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      log(`Created default configuration at: ${configPath}`);
    }
    
    // Apply environment config as fallbacks
    config.jobs = config.jobs.map(job => {
      // Use environment gemini model if job config doesn't specify one
      if (!job.geminiConfig?.model || job.geminiConfig.model === '') {
        job.geminiConfig = { 
          ...job.geminiConfig, 
          model: envConfig.geminiModel 
        };
      }
      
      // Use environment Opsgenie API key if job config doesn't have one
      if (envConfig.opsgenieApiKey && !job.notificationConfig.opsgenieApiKey) {
        job.notificationConfig.opsgenieApiKey = envConfig.opsgenieApiKey;
      }
      
      return job;
    });
    
    log('Configuration loaded successfully.');
    return config;
    
  } catch (err: any) {
    error(`Failed to load configuration from ${configPath}:`, err.message);
    process.exit(1);
  }
}

async function main() {
  // Enable CLI mode for clean output on CLI commands
  setCliMode(true);

  // Initialize quietly for CLI commands
  await ContextLoader.initializeDefaultContext();
  await JobTemplateManager.loadTemplates();
  const config = await loadConfigurationQuietly();

  // Setup CLI
  const argv = await yargs(hideBin(process.argv))
    .scriptName('gjob')
    .usage('Usage: $0 <command> [options]')
    .command('setup', 'Run the interactive setup wizard', () => {}, async () => {
      const { spawn } = await import('child_process');
      const setupScript = path.join(__dirname, '../scripts/setup.js');
      
      const setupProcess = spawn('node', [setupScript], {
        stdio: 'inherit'
      });
      
      setupProcess.on('close', (code) => {
        if (code === 0) {
          log('Setup completed successfully!');
        } else {
          error('Setup failed');
          process.exit(1);
        }
      });
    })
    .command('list-jobs', 'List all configured jobs', () => {}, () => {
      console.log('\n📄 Configured Jobs\n' + '='.repeat(18));
      if (config.jobs.length === 0) {
        console.log('📇 No jobs configured. Run: gjob setup');
        return;
      }
      config.jobs.forEach(job => {
        const status = job.enabled ? '✅ enabled' : '⏸️  disabled';
        const schedules = job.schedules?.length > 0 ? ` (${job.schedules.join(', ')})` : ' (manual)';
        console.log(`📋 ${job.jobName} - ${status}${schedules}`);
      });
      console.log();
    })
    .command('list-templates', 'List all available job templates', () => {}, () => {
      console.log('\n📄 Available Job Templates\n' + '='.repeat(27));
      JobTemplateManager.listTemplates().forEach(template => {
        console.log(`📄 ${template.templateId}: ${template.templateName}`);
        console.log(`   ${template.description}\n`);
      });
    })
    .command('run <jobName>', 'Run a specific job immediately', 
      (yargs) => {
        return yargs.positional('jobName', {
          describe: 'Name of the job to run',
          type: 'string'
        });
      }, 
      async (argv) => {
        const jobToRun = config.jobs.find(job => 
          job.jobName.toLowerCase() === (argv.jobName as string).toLowerCase()
        );
        
        if (jobToRun) {
          console.log(`\n🚀 Running job: ${jobToRun.jobName}\n`);
          // Disable CLI mode for job execution to get detailed logs
          setCliMode(false);
          await runTemplatedJob(jobToRun);
        } else {
          console.log(`\n❌ Job not found: ${argv.jobName}`);
          console.log('\nAvailable jobs:');
          config.jobs.forEach(job => {
            console.log(`  - ${job.jobName}`);
          });
          console.log();
        }
      }
    )
    .command('start', 'Start the job scheduler', () => {}, async () => {
        console.log('\\n🚀 Starting Gemini CLI Job Scheduler\\n' + '='.repeat(36));
        console.log(`📁 Configuration: ${configPath}`);
        
        if (config.jobs.length === 0) {
          console.log('📝 No jobs configured. Run: gjob setup');
          return;
        }
        
        console.log(`\\n📅 Scheduling ${config.jobs.length} job(s):`);
        
        // Schedule jobs
        config.jobs.filter(job => job.enabled).forEach(job => {
          const schedulesList = job.schedules?.join(', ') || 'manual';
          console.log(`📋 ${job.jobName}: ${schedulesList}`);
          
          if (job.schedules && job.schedules.length > 0) {
            job.schedules.forEach(schedule => {
              cron.schedule(schedule, async () => {
                console.log(`\\n⏰ Executing scheduled job: ${job.jobName}`);
                // Disable CLI mode for job execution
                setCliMode(false);
                await runTemplatedJob(job);
                setCliMode(true);
              });
            });
          }
        });
        
        console.log('\\n✅ Scheduler started. Press Ctrl+C to stop.\\n');
        
        // Keep the process running
        process.stdin.resume();
      }
    )
    .demandCommand(1, 'You need to specify a command')
    .help()
    .parseAsync();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Start the application
if (require.main === module) {
  main().catch((err) => {
    error('Application failed to start:', err.message);
    process.exit(1);
  });
}