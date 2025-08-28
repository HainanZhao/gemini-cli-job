#!/usr/bin/env node
import * as cron from 'node-cron';
import { log, error, setCliMode, cliSuccess, cliInfo, cliError, cliHeader, getLogDirectory, getTodayLogFilePath, cleanupOldLogs, enableConsoleCapture, disableConsoleCapture, logJobExecution } from './utils/logger';
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
  // Enable console capture for comprehensive logging
  enableConsoleCapture();
  
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
          logJobExecution(jobToRun.jobName, 'Starting manual job execution');
          console.log(`\n🚀 Running job: ${jobToRun.jobName}\n`);
          // Disable CLI mode for job execution to get detailed logs
          setCliMode(false);
          await runTemplatedJob(jobToRun, configDirectory, config.geminiOptions, config.googleCloudProject);
          logJobExecution(jobToRun.jobName, 'Manual job execution completed');
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
                logJobExecution(job.jobName, `Starting scheduled execution (${schedule})`);
                console.log(`\n⏰ Executing scheduled job: ${job.jobName}`);
                // Disable CLI mode for job execution
                setCliMode(false);
                await runTemplatedJob(job, configDirectory, config.geminiOptions, config.googleCloudProject);
                setCliMode(true);
                logJobExecution(job.jobName, 'Scheduled execution completed');
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
    .command(
      'logs',
      'Manage log files',
      (yargs) => {
        return yargs
          .option('path', {
            type: 'boolean',
            description: 'Show log directory path'
          })
          .option('today', {
            type: 'boolean',
            description: 'Show today\'s log file path'
          })
          .option('cleanup', {
            type: 'number',
            description: 'Clean up log files older than specified days'
          })
          .check((argv) => {
            // Only allow one option at a time
            const options = [argv.path, argv.today, argv.cleanup !== undefined];
            const optionCount = options.filter(Boolean).length;
            
            if (optionCount > 1) {
              throw new Error('Please specify only one option at a time');
            }
            
            return true;
          });
      },
      async (argv) => {
        if (argv.path) {
          // Show log directory path
          const logDir = getLogDirectory();
          cliInfo(`Log directory: ${logDir}`);
        } else if (argv.today) {
          // Show today's log file path
          const todayLogFile = getTodayLogFilePath();
          cliInfo(`Today's log file: ${todayLogFile}`);
        } else if (argv.cleanup !== undefined) {
          // Clean up old log files
          const days = argv.cleanup as number;
          if (days < 0) {
            cliError('Days must be a positive number');
            process.exit(1);
          }
          
          cliHeader(`Cleaning up log files older than ${days} days`);
          cleanupOldLogs(days);
          cliSuccess('Log cleanup completed');
        } else {
          // Default: Display log information dashboard
          const logDir = getLogDirectory();
          const todayLogFile = getTodayLogFilePath();
          
          cliHeader('Log Information Dashboard');
          console.error('DEBUG: About to call log() functions');
          console.error(`DEBUG: logDir = "${logDir}"`);
          console.error(`DEBUG: todayLogFile = "${todayLogFile}"`);
          log('TESTING-SIMPLE-LOG');
          log('TESTING-LOG-CAPTURE-LOGDIR', logDir);
          log('TESTING-LOG-CAPTURE-TODAY', todayLogFile);
          console.error('DEBUG: All log() calls completed');
          
          // Show recent log files
          try {
            if (fs.existsSync(logDir)) {
              const files = fs.readdirSync(logDir)
                .filter(file => file.endsWith('.log'))
                .map(file => {
                  const filePath = path.join(logDir, file);
                  const stats = fs.statSync(filePath);
                  return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    modified: stats.mtime
                  };
                })
                .sort((a, b) => b.modified.getTime() - a.modified.getTime())
                .slice(0, 5); // Show last 5 files
              
              if (files.length > 0) {
                log('\n📋 Recent Log Files:');
                files.forEach(file => {
                  const sizeKB = Math.round(file.size / 1024);
                  const modifiedDate = file.modified.toLocaleDateString();
                  log(`  📄 ${file.name} (${sizeKB} KB, ${modifiedDate})`);
                });
              } else {
                log('\n📝 No log files found');
              }
            } else {
              log('\n📝 Log directory does not exist yet');
            }
          } catch (err: any) {
            log('\n⚠️  Could not read log directory');
          }
          
          log('\n💡 Usage:');
          log('  gjob logs --path     Show log directory path');
          log('  gjob logs --today    Show today\'s log file path');
          log('  gjob logs --cleanup <days>  Clean up old log files');
          log('');
        }
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