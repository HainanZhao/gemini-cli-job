#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

/**
 * Simple Setup System for Gemini CLI Job
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SimpleSetup {
  constructor() {
    this.configDir = path.join(os.homedir(), '.gemini-cli-job');
    this.configPath = path.join(this.configDir, 'config.json');
    this.envPath = path.join(process.cwd(), '.env');
  }

  async run() {
    console.log('🚀 Gemini CLI Job - Easy Setup');
    console.log('===============================\\n');
    
    console.log('Choose your setup level:\\n');
    console.log('1. 🎯 Quick Start (1 minute) - Get started immediately');
    console.log('2. 🔧 Custom Setup (5 minutes) - Configure your needs');
    console.log('3. 💡 Show Examples - See configuration examples\\n');

    const choice = await this.ask('Select option (1-3): ');
    
    switch (choice) {
      case '1':
        await this.quickStart();
        break;
      case '2':
        await this.customSetup();
        break;
      case '3':
        await this.showExamples();
        break;
      default:
        console.log('Using quick start...');
        await this.quickStart();
    }

    rl.close();
  }

  async quickStart() {
    console.log('\\n🎯 Quick Start Setup');
    console.log('====================\\n');
    
    // Essential info only
    const projectName = await this.ask('What is your main project name? ');
    const googleProject = await this.ask('Your Google Cloud Project ID: ');
    
    // Create simple config
    const config = {
      jobs: [{
        jobName: `${projectName}-release-notes`,
        jobType: 'templated',
        enabled: false, // Start disabled for safety
        schedules: ['0 9 * * 1'], // Monday 9 AM
        
        templateConfig: {
          templateId: 'release-notes',
          parameters: {
            projectName: projectName
          }
        },
        
        notificationConfig: {
          type: 'console',
          message: `Release Notes: ${projectName}`,
          alias: `${projectName}-releases`,
          description: 'Weekly release notes',
          teams: [],
          tags: ['release-notes'],
          details: {},
          entity: projectName,
          priority: 'P4'
        }
      }]
    };

    // Create simple .env
    const envContent = `# Gemini CLI Job Configuration
GOOGLE_CLOUD_PROJECT="${googleProject}"
GEMINI_MODEL="gemini-1.5-flash"
JOB_MODE="p"
GEMINI_NOTIFICATION_ENABLED="true"
`;

    // Write files
    this.ensureConfigDir();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    fs.writeFileSync(this.envPath, envContent);

    console.log('\\n✅ Quick setup completed!');
    console.log(`📁 Config saved to: ${this.configPath}`);
    console.log(`🔧 Environment: ${this.envPath}\\n`);
    
    console.log('🚀 Next steps:');
    console.log('1. Test: npm start -- --job ' + `${projectName}-release-notes`);
    console.log('2. Enable: Edit config.json and set "enabled": true');
    console.log('3. Customize: Run "npm run setup" for more options\\n');
  }

  async customSetup() {
    console.log('\\n🔧 Custom Setup');
    console.log('================\\n');
    
    const googleProject = await this.ask('Google Cloud Project ID: ');
    const geminiModel = await this.ask('Gemini Model (gemini-1.5-flash): ') || 'gemini-1.5-flash';
    
    console.log('\\n📋 What type of automation do you want?\\n');
    console.log('1. 📦 Release Notes - Track project releases');
    console.log('2. 📊 Weekly Updates - Team activity summaries'); 
    console.log('3. 🌅 Daily Standups - Daily team check-ins');
    console.log('4. 📝 Custom Reports - Your own automation\\n');

    const jobType = await this.ask('Select job type (1-4): ');
    const jobName = await this.ask('Job name (e.g., "weekly-frontend-updates"): ');
    
    let jobConfig = await this.createJobConfig(jobType, jobName);
    
    // Create environment
    const envContent = `# Gemini CLI Job Configuration
GOOGLE_CLOUD_PROJECT="${googleProject}"
GEMINI_MODEL="${geminiModel}"
JOB_MODE="p"
GEMINI_NOTIFICATION_ENABLED="true"
`;

    // Create full config
    const config = { jobs: [jobConfig] };
    
    // Write files
    this.ensureConfigDir();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    fs.writeFileSync(this.envPath, envContent);

    console.log('\\n✅ Custom setup completed!');
    console.log(`📁 Config: ${this.configPath}`);
    console.log(`🔧 Environment: ${this.envPath}\\n`);
    
    console.log('🧪 Test your setup:');
    console.log(`   npm start -- --job ${jobName}\\n`);
  }

  async createJobConfig(jobType, jobName) {
    switch (jobType) {
      case '1': // Release Notes
        const projectName = await this.ask('Project name: ');
        return {
          jobName: jobName,
          jobType: 'templated',
          enabled: false,
          schedules: ['0 9 * * 1'],
          templateConfig: {
            templateId: 'release-notes',
            parameters: { projectName: projectName }
          },
          notificationConfig: this.createNotificationConfig(`Release Notes: ${projectName}`)
        };

      case '2': // Weekly Updates  
        const teamName = await this.ask('Team name: ');
        const users = await this.ask('Team emails (comma-separated): ');
        return {
          jobName: jobName,
          jobType: 'templated', 
          enabled: false,
          schedules: ['0 17 * * 5'],
          templateConfig: {
            templateId: 'weekly-update',
            parameters: {
              users: users.split(',').map(u => u.trim()),
              teamName: teamName
            }
          },
          notificationConfig: this.createNotificationConfig(`Weekly Update: ${teamName}`)
        };

      case '3': // Daily Standups
        const dailyTeam = await this.ask('Team name: ');
        const dailyUsers = await this.ask('Team emails (comma-separated): ');
        return {
          jobName: jobName,
          jobType: 'templated',
          enabled: false, 
          schedules: ['0 8 * * 1-5'],
          templateConfig: {
            templateId: 'daily-standup',
            parameters: {
              users: dailyUsers.split(',').map(u => u.trim()),
              teamName: dailyTeam
            }
          },
          notificationConfig: this.createNotificationConfig(`Daily Standup: ${dailyTeam}`)
        };

      case '4': // Custom
      default:
        const prompt = await this.ask('Custom AI prompt: ');
        const focusAreas = await this.ask('Focus areas: ');
        return {
          jobName: jobName,
          jobType: 'templated',
          enabled: false,
          schedules: ['0 9 * * 1'],
          templateConfig: {
            templateId: 'custom-report',
            parameters: {
              reportType: 'custom',
              customPrompt: prompt,
              focusAreas: focusAreas
            }
          },
          notificationConfig: this.createNotificationConfig('Custom Report')
        };
    }
  }

  createNotificationConfig(message) {
    return {
      type: 'console',
      message: message,
      alias: message.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: `Generated by setup: ${message}`,
      teams: [],
      tags: ['gemini-cli-job'],
      details: {},
      entity: message,
      priority: 'P4'
    };
  }

  async showExamples() {
    console.log('\\n💡 Configuration Examples');
    console.log('==========================\\n');
    
    console.log('🎯 Simple Release Notes Job:');
    console.log(JSON.stringify({
      jobName: 'my-app-releases',
      jobType: 'templated',
      enabled: true,
      schedules: ['0 9 * * 1'],
      templateConfig: {
        templateId: 'release-notes',
        parameters: { projectName: 'my-app' }
      }
    }, null, 2));

    console.log('\\n📊 Team Weekly Update:');
    console.log(JSON.stringify({
      jobName: 'team-weekly',
      jobType: 'templated', 
      enabled: true,
      schedules: ['0 17 * * 5'],
      templateConfig: {
        templateId: 'weekly-update',
        parameters: {
          users: ['dev1@company.com', 'dev2@company.com'],
          teamName: 'Frontend Team'
        }
      }
    }, null, 2));

    console.log('\\n📝 Custom Report:');
    console.log(JSON.stringify({
      jobName: 'monthly-metrics',
      jobType: 'templated',
      enabled: true, 
      schedules: ['0 9 1 * *'],
      templateConfig: {
        templateId: 'custom-report',
        parameters: {
          reportType: 'monthly',
          customPrompt: 'Generate team productivity metrics',
          focusAreas: 'velocity, quality, collaboration'
        }
      }
    }, null, 2));

    console.log('\\n📚 Learn more: Check the templates directory for full documentation\\n');
  }

  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  ask(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// Run setup
if (require.main === module) {
  const setup = new SimpleSetup();
  setup.run().catch((error) => {
    console.error('Setup failed:', error);
    rl.close();
    process.exit(1);
  });
}