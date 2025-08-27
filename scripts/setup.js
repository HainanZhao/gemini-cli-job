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
    // Use custom config directory if provided as command line argument
    const customConfigDir = process.argv[2];
    this.configDir = customConfigDir || path.join(os.homedir(), '.gemini-cli-job');
    this.configPath = path.join(this.configDir, 'config.json');
    this.envPath = path.join(process.cwd(), '.env');
    
    if (customConfigDir) {
      console.log(`Using custom config directory: ${this.configDir}`);
    }
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
        enabled: false, // Start disabled for safety
        schedules: this.getTemplateSchedules('release-notes'),
        
        promptConfig: {
          contextFiles: ['context/release-notes-rules.md'],
          customPrompt: `Generate release notes for project: ${projectName}`
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
    this.generateContextFiles();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    fs.writeFileSync(this.envPath, envContent);

    console.log('\\n✅ Quick setup completed!');
    console.log(`📁 Config saved to: ${this.configPath}`);
    console.log(`🔧 Environment: ${this.envPath}`);
    console.log(`📝 Context files ready for customization\\n`);
    
    console.log('🚀 Next steps:');
    console.log('1. Update template files in ~/.gemini-cli-job/context/');
    console.log('2. Test: gjob run ' + `${projectName}-release-notes`);
    console.log('3. Enable: Edit config and set "enabled": true');
    console.log('4. Start scheduler: gjob start\\n');
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
    this.generateContextFiles();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    fs.writeFileSync(this.envPath, envContent);

    console.log('\\n✅ Custom setup completed!');
    console.log(`📁 Config: ${this.configPath}`);
    console.log(`🔧 Environment: ${this.envPath}`);
    console.log(`📝 Context files ready for customization\\n`);
    
    console.log('🧪 Next steps:');
    console.log('1. Update template files in ~/.gemini-cli-job/context/');
    console.log('2. Test: gjob run ' + jobName);
    console.log('3. Enable and start: gjob start\\n');
  }

  async createJobConfig(jobType, jobName) {
    switch (jobType) {
      case '1': // Release Notes
        const customPrompt1 = await this.ask('Custom prompt to append (optional): ') || '';
        return {
          jobName: jobName,
          enabled: false,
          schedules: this.getTemplateSchedules('release-notes'),
          promptConfig: {
            contextFiles: ['context/release-notes-rules.md'],
            customPrompt: customPrompt1 || undefined
          }
        };

      case '2': // Weekly Updates  
        const customPrompt2 = await this.ask('Custom prompt to append (optional): ') || '';
        return {
          jobName: jobName,
          enabled: false,
          schedules: this.getTemplateSchedules('weekly-update'),
          promptConfig: {
            contextFiles: ['context/weekly-update-rules.md'],
            customPrompt: customPrompt2 || undefined
          }
        };

      case '3': // Daily Standups
        const customPrompt3 = await this.ask('Custom prompt to append (optional): ') || '';
        return {
          jobName: jobName,
          enabled: false,
          schedules: this.getTemplateSchedules('daily-standup'),
          promptConfig: {
            contextFiles: ['context/daily-standup-rules.md'],
            customPrompt: customPrompt3 || undefined
          }
        };      case '4': // Custom
      default:
        const customPrompt = await this.ask('Your custom AI prompt: ');
        return {
          jobName: jobName,
          enabled: false,
          schedules: this.getTemplateSchedules('custom'),
          promptConfig: {
            contextFiles: ['custom'],
            customPrompt: customPrompt
          }
        };
    }
  }

  async showExamples() {
    console.log('\\n💡 Configuration Examples');
    console.log('==========================\\n');
    
    console.log('🎯 Simple Release Notes Job:');
    console.log(JSON.stringify({
      jobName: 'my-app-releases',
      enabled: true,
      schedules: this.getTemplateSchedules('release-notes'),
      promptConfig: {
        contextFiles: ['context/release-notes-rules.md'],
        customPrompt: 'Generate release notes for my-app project, focusing on user-facing changes'
      }
    }, null, 2));

    console.log('\\n📊 Team Weekly Update:');
    console.log(JSON.stringify({
      jobName: 'team-weekly',
      enabled: true,
      schedules: this.getTemplateSchedules('weekly-update'),
      promptConfig: {
        contextFiles: ['context/weekly-update-rules.md'],
        customPrompt: 'Generate weekly update for Frontend Team, include velocity metrics and upcoming deadlines'
      }
    }, null, 2));

    console.log('\\n📝 Custom Report:');
    console.log(JSON.stringify({
      jobName: 'monthly-metrics',
      enabled: true, 
      schedules: this.getTemplateSchedules('custom'),
      promptConfig: {
        contextFiles: ['custom'],
        customPrompt: 'Generate monthly team productivity metrics report focusing on velocity, quality, and collaboration'
      }
    }, null, 2));

    console.log('\\n� Multi-Template Job (NEW!):');
    console.log(JSON.stringify({
      jobName: 'comprehensive-report',
      enabled: true,
      schedules: ['0 9 * * 1'],
      promptConfig: {
        contextFiles: [
          'context/about.md',
          'context/release-notes-rules.md',
          'context/weekly-update-rules.md'
        ],
        customPrompt: 'Generate a comprehensive weekly report combining all context'
      }
    }, null, 2));

    console.log('\\n�📚 Learn more: Check the templates directory for full documentation\\n');
  }

  generateContextFiles() {
    const templateDir = path.join(this.configDir, 'templates');
    
    // Ensure template directory exists
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    const sampleContextFiles = {
      'about.md': `# About Your Organization

Add information about your company, team, or project here.
This context will be included in relevant job outputs.

## Company/Team Info
- Name: [Your Company/Team Name]
- Mission: [Your mission statement]
- Key products/services: [Brief description]

## Current Focus
- [Current quarter/sprint goals]
- [Key initiatives]
- [Important deadlines]

Update this file with your specific information.`,

      'daily-standup-rules.md': `# Daily Standup Rules

## Meeting Guidelines
- Keep updates concise (2-3 minutes per person)
- Focus on: what you did yesterday, what you're doing today, any blockers
- Mention dependencies and collaboration needs
- Highlight any urgent issues or deadlines

## Reporting Format
**Yesterday:**
- [Key accomplishments]

**Today:**
- [Planned work]

**Blockers:**
- [Any impediments]

Update these rules to match your team's standup format.`,

      'products.md': `# Products and Services

## Main Products
1. **[Product Name]**
   - Description: [Brief description]
   - Key features: [Main features]  
   - Target audience: [Who uses it]

## Services
- [Service 1]: [Description]
- [Service 2]: [Description]

## Technology Stack
- Frontend: [Technologies]
- Backend: [Technologies]
- Database: [Technologies]
- Infrastructure: [Cloud/hosting]

Update with your actual products and services.`,

      'release-notes-rules.md': `# Release Notes Guidelines

## Format
### Added
- New features and capabilities

### Changed
- Modifications to existing features

### Fixed
- Bug fixes and issue resolutions

### Removed
- Deprecated or removed features

## Style Guidelines
- Use clear, user-friendly language
- Focus on user impact, not technical details
- Include relevant links or documentation
- Mention breaking changes prominently

## Categories to Include
- User-facing changes
- API changes
- Performance improvements
- Security updates

Customize these rules for your release process.`,

      'weekly-update-rules.md': `# Weekly Update Guidelines

## Report Structure
### Accomplishments
- Major milestones reached
- Key deliverables completed
- Problems solved

### Current Work
- Active projects and tasks
- Progress on ongoing initiatives

### Upcoming
- Next week's priorities
- Upcoming deadlines
- Planned meetings or events

### Challenges
- Blockers or obstacles
- Areas needing support
- Resource constraints

## Audience
- Team members
- Management
- Stakeholders

Adjust the format and content for your team's needs.`,

      'workflows.md': `# Team Workflows

## Development Workflow
1. **Planning**
   - Sprint planning meetings
   - Story pointing and estimation
   - Task assignment

2. **Development**
   - Feature branch creation
   - Code review process
   - Testing requirements

3. **Deployment**
   - CI/CD pipeline
   - Environment promotion
   - Release procedures

## Communication
- Daily standups: [Time and format]
- Sprint reviews: [Frequency and process]
- Retrospectives: [How often and format]

## Tools
- Project management: [Tool name]
- Version control: [Git workflow]
- Communication: [Slack, Teams, etc.]

Update with your actual workflows and processes.`
    };

    // Generate each context file
    Object.entries(sampleContextFiles).forEach(([filename, content]) => {
      const filePath = path.join(templateDir, filename);
      
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
        console.log(`📝 Generated sample context file: ${filename}`);
      } else {
        console.log(`📝 Context file already exists: ${filename}`);
      }
    });

    console.log(`📁 Sample template files available in: ${templateDir}`);
  }

  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  getTemplateSchedules(templateType) {
    const schedules = {
      'release-notes': ['0 9 * * 1'], // Monday 9 AM
      'weekly-update': ['0 17 * * 5'], // Friday 5 PM  
      'daily-standup': ['0 8 * * 1-5'], // Weekdays 8 AM
      'custom': ['0 9 * * 1'] // Monday 9 AM default
    };
    return schedules[templateType] || ['0 9 * * 1'];
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