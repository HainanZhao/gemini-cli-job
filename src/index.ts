#!/usr/bin/env node
import * as cron from 'node-cron';
import { log, error, setCliMode, cliSuccess, cliInfo, cliError, cliHeader } from './utils/logger';
import { runTemplatedJob, SimpleJobConfig, JobTemplateManager } from './jobs/templatedJob';
import { EnvConfigLoader } from './utils/envConfigLoader';
import { ContextLoader } from './utils/contextLoader';
import { JobMemory } from './utils/jobMemory';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface Config {
  googleCloudProject?: string;
  geminiOptions?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  jobs: SimpleJobConfig[];
}

// Global config directory - can be overridden via CLI
let configDirectory = path.join(os.homedir(), '.gemini-cli-job');
let configPath = path.join(configDirectory, 'config.json');

// Helper to set config directory and update all paths
function setConfigDirectory(customDir: string) {
  configDirectory = path.resolve(customDir);
  configPath = path.join(configDirectory, 'config.json');
}

// Helper to set config file path directly
function setConfigFile(configFilePath: string) {
  configPath = path.resolve(configFilePath);
  configDirectory = path.dirname(configPath);
}

async function loadConfigurationQuietly(): Promise<Config> {
  try {
    // Load environment configuration (quietly)
    const envConfig = EnvConfigLoader.loadEnvConfig();
    
    // Ensure config directory exists
    if (!fs.existsSync(configDirectory)) {
      fs.mkdirSync(configDirectory, { recursive: true });
    }

    // Load JSON configuration or create default
    let config: Config;
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      config = { jobs: [] };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
    
    return config;
  } catch (err: any) {
    throw new Error(`Failed to load configuration: ${err.message}`);
  }
}

async function main() {
  // Enable CLI mode for clean output on CLI commands
  setCliMode(true);

  // Parse CLI arguments first to get config file
  const argv = await yargs(hideBin(process.argv))
    .scriptName('gjob')
    .usage('Usage: $0 <command> [options]')
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'Path to config.json file (default: ~/.gemini-cli-job/config.json)',
      global: true
    })
    .middleware((argv) => {
      // Set config file path if provided
      if (argv['config']) {
        const configFilePath = path.resolve(argv['config'] as string);
        configPath = configFilePath;
        configDirectory = path.dirname(configFilePath);
        log(`Using custom config file: ${configPath}`);
        log(`Config directory: ${configDirectory}`);
      }
    })
    .command('setup', 'Run the interactive setup wizard', () => {}, async () => {
      const { spawn } = await import('child_process');
      const setupScript = path.join(__dirname, '../scripts/setup.js');
      
      const setupProcess = spawn('node', [setupScript, configDirectory], {
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
    .command('list', 'List all configured jobs', () => {}, async () => {
      const config = await loadConfigurationQuietly();
      
      console.log('\n📄 Configured Jobs\n' + '='.repeat(18));
      if (config.jobs.length === 0) {
        console.log('📇 No jobs configured. Run: gjob setup');
        return;
      }
      config.jobs.forEach((job: SimpleJobConfig) => {
        const status = job.enabled ? '✅ enabled' : '⏸️  disabled';
        const schedules = job.schedules?.length > 0 ? ` (${job.schedules.join(', ')})` : ' (manual)';
        console.log(`📋 ${job.jobName} - ${status}${schedules}`);
      });
      console.log();
    })
    .command('templates', 'Show template directory info', () => {}, async () => {
      const templatesDir = path.join(configDirectory, 'templates');
      
      console.log('\n📁 Template Directory Information');
      console.log('='.repeat(35));
      console.log(`📂 Templates location: ${templatesDir}`);
      console.log(`📄 Config file: ${configPath}`);
      console.log('\n💡 Usage: Configure contextFiles in your config.json to specify which templates to use');
      console.log('Example: "contextFiles": ["templates/about.md", "templates/release-notes-rules.md"]\n');
    })
    .command('run <jobName>', 'Run a specific job immediately', 
      (yargs) => {
        return yargs.positional('jobName', {
          describe: 'Name of the job to run',
          type: 'string'
        });
      }, 
      async (argv) => {
        const config = await loadConfigurationQuietly();
        
        const jobToRun = config.jobs.find((job: SimpleJobConfig) => 
          job.jobName.toLowerCase() === (argv.jobName as string).toLowerCase()
        );
        
        if (jobToRun) {
          console.log(`\n🚀 Running job: ${jobToRun.jobName}\n`);
          // Disable CLI mode for job execution to get detailed logs
          setCliMode(false);
          await runTemplatedJob(jobToRun, configDirectory, config.geminiOptions, config.googleCloudProject);
        } else {
          console.log(`\n❌ Job not found: ${argv.jobName}`);
          console.log('\nAvailable jobs:');
          config.jobs.forEach((job: SimpleJobConfig) => {
            console.log(`  - ${job.jobName}`);
          });
          console.log();
        }
      }
    )
    .command('start', 'Start the job scheduler', () => {}, async () => {
        const config = await loadConfigurationQuietly();
        
        console.log('\n🚀 Starting Gemini CLI Job Scheduler\n' + '='.repeat(36));
        console.log(`📁 Configuration: ${configPath}`);
        
        if (config.jobs.length === 0) {
          console.log('📝 No jobs configured. Run: gjob setup');
          return;
        }
        
        console.log(`\n📅 Scheduling ${config.jobs.length} job(s):`);
        
        // Schedule jobs
        config.jobs.filter((job: SimpleJobConfig) => job.enabled).forEach((job: SimpleJobConfig) => {
          const schedulesList = job.schedules?.join(', ') || 'manual';
          console.log(`📋 ${job.jobName}: ${schedulesList}`);
          
          if (job.schedules && job.schedules.length > 0) {
            job.schedules.forEach((schedule: string) => {
              cron.schedule(schedule, async () => {
                console.log(`\n⏰ Executing scheduled job: ${job.jobName}`);
                // Disable CLI mode for job execution
                setCliMode(false);
                await runTemplatedJob(job, configDirectory, config.geminiOptions, config.googleCloudProject);
                setCliMode(true);
              });
            });
          }
        });
        
        console.log('\n✅ Scheduler started. Press Ctrl+C to stop.\n');
        
        // Keep the process running
        process.stdin.resume();
      }
    )
    .command(
      'memory',
      'Manage job memory',
      (yargs) => {
        return yargs
          .command(
            'list',
            'List all jobs with memory',
            {},
            async () => {
              try {
                const memoryDir = JobMemory.getMemoryDirectory();
                const fs = await import('fs');
                const path = await import('path');
                
                if (!fs.existsSync(memoryDir)) {
                  console.log('No job memories found.');
                  return;
                }
                
                const files = fs.readdirSync(memoryDir).filter(file => file.endsWith('.json'));
                
                if (files.length === 0) {
                  console.log('No job memories found.');
                  return;
                }
                
                console.log('\n📝 Jobs with memory:');
                for (const file of files) {
                  const jobName = path.basename(file, '.json');
                  const filePath = path.join(memoryDir, file);
                  const stats = fs.statSync(filePath);
                  console.log(`  ${jobName} (last modified: ${stats.mtime.toLocaleDateString()})`);
                }
                console.log();
              } catch (err: any) {
                error('Failed to list job memories:', err.message);
                process.exit(1);
              }
            }
          )
          .command(
            'show <jobName>',
            'Show memory content for a specific job',
            (yargs) => {
              return yargs.positional('jobName', {
                describe: 'Name of the job to show memory for',
                type: 'string',
                demandOption: true
              });
            },
            async (argv) => {
              try {
                const memory = await JobMemory.loadJobMemory(argv.jobName);
                
                if (Object.keys(memory).length === 0) {
                  console.log(`No memory found for job: ${argv.jobName}`);
                  return;
                }
                
                console.log(`\n📋 Memory for job: ${argv.jobName}`);
                console.log('─'.repeat(40));
                
                for (const [key, value] of Object.entries(memory)) {
                  console.log(`${key}: ${value}`);
                }
                console.log();
              } catch (err: any) {
                error(`Failed to show memory for job ${argv.jobName}:`, err.message);
                process.exit(1);
              }
            }
          )
          .command(
            'clear <jobName>',
            'Clear memory for a specific job',
            (yargs) => {
              return yargs.positional('jobName', {
                describe: 'Name of the job to clear memory for',
                type: 'string',
                demandOption: true
              });
            },
            async (argv) => {
              try {
                const fs = await import('fs');
                const path = await import('path');
                const memoryDir = JobMemory.getMemoryDirectory();
                const memoryFile = path.join(memoryDir, `${argv.jobName}.json`);
                
                if (fs.existsSync(memoryFile)) {
                  fs.unlinkSync(memoryFile);
                  console.log(`✅ Memory cleared for job: ${argv.jobName}`);
                } else {
                  console.log(`No memory found for job: ${argv.jobName}`);
                }
              } catch (err: any) {
                error(`Failed to clear memory for job ${argv.jobName}:`, err.message);
                process.exit(1);
              }
            }
          )
          .demandCommand(1, 'You need to specify a memory command')
          .help();
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