import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { CommandResult, CommandOptions } from '../types/index';

export class InitCommand implements ICommand {
  public readonly name = 'init';
  public readonly description =
    'Initialize AIA configuration for a new codebase';
  public readonly aliases = ['i'];

  public async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    const projectRoot = process.cwd();
    const templateRoot = path.resolve(__dirname, '../../.aia');
    const docsRoot = path.resolve(__dirname, '../../docs');
    const vscodeExtensionRoot = path.resolve(
      __dirname,
      '../../.vscode/aia-copilot-bridge'
    );

    // Parse options for VSCode extension installation
    const installVSCode = options.vscode !== false; // Default to true unless explicitly disabled
    const skipVSCode = args.includes('--skip-vscode') || options.skipVscode;
    const autoSetup = Boolean(
      args.includes('--auto-setup') || options.autoSetup
    );

    // Ensure .aia directory exists
    await fs.ensureDir(path.join(projectRoot, '.aia'));

    // Core AIA files
    const coreFiles = [
      'config.json',
      'profiles.json',
      'user.json',
      'codebase-index.json',
    ];
    for (const file of coreFiles) {
      const src = path.join(templateRoot, file);
      const dest = path.join(projectRoot, '.aia', file);
      if (!(await fs.pathExists(dest))) {
        await fs.copy(src, dest);
        console.log(chalk.green(`Created ${dest}`));
      } else {
        console.log(chalk.yellow(`${dest} already exists, skipped`));
      }
    }

    // Read output directories from config (after creating it)
    const configPath = path.join(projectRoot, '.aia', 'config.json');
    let outputDirs: Record<string, string> = {};
    try {
      const cfg = await fs.readJSON(configPath);
      outputDirs = (cfg.outputDirectories as Record<string, string>) || {};
    } catch (err) {
      console.log(chalk.red('Error reading .aia/config.json:'), err);
      return { success: false, error: 'Failed to read config.json' };
    }

    // Copy documentation templates (excluding auto-generated copilot-instructions.md)
    const docsTemplates: Array<[string, keyof typeof outputDirs]> = [
      ['architecture/codebase-architecture.md', 'architecture'],
      ['comprehensive/codebase-comprehensive.md', 'comprehensive'],
      ['developer/codebase-dev-focused.md', 'developer'],
      ['minimal/codebase-minimal.md', 'minimal'],
    ];
    for (const [tplPath, key] of docsTemplates) {
      const src = path.join(docsRoot, tplPath);
      const outDirRel = outputDirs[key];
      if (!outDirRel) continue;
      const destDir = path.resolve(projectRoot, outDirRel);
      await fs.ensureDir(destDir);
      const fileName = path.basename(tplPath);
      const dest = path.join(destDir, fileName);
      if (!(await fs.pathExists(dest))) {
        await fs.copy(src, dest);
        console.log(chalk.green(`Created ${dest}`));
      } else {
        console.log(chalk.yellow(`${dest} already exists, skipped`));
      }
    }

    // Install VSCode extension if requested
    if (installVSCode && !skipVSCode) {
      await this.installVSCodeExtension(
        projectRoot,
        vscodeExtensionRoot,
        autoSetup
      );

      // Additional note about the extension
      console.log(chalk.blue('📝 VSCode Extension Notes:'));
      console.log(
        chalk.white(
          '  • The extension provides O(1) symbol lookup for GitHub Copilot'
        )
      );
      console.log(
        chalk.white('  • Auto-updates symbol index when files change')
      );
      console.log(
        chalk.white('  • Enhances Copilot with project-specific context')
      );
      console.log(
        chalk.white(
          '  • Use "AIA:" commands in Command Palette for manual control'
        )
      );
    } else if (skipVSCode) {
      console.log(chalk.yellow('VSCode extension installation skipped'));
    }

    console.log(chalk.blue('AIA initialization complete.'));
    return { success: true };
  }

  private async installVSCodeExtension(
    projectRoot: string,
    extensionRoot: string,
    autoSetup: boolean = false
  ): Promise<void> {
    const vscodeDir = path.join(projectRoot, '.vscode');
    const extensionDestDir = path.join(vscodeDir, 'aia-copilot-bridge');

    // Check if VSCode extension already exists
    if (await fs.pathExists(extensionDestDir)) {
      console.log(chalk.yellow('VSCode AIA extension already exists, skipped'));
      return;
    }

    // Check if source extension exists
    if (!(await fs.pathExists(extensionRoot))) {
      console.log(
        chalk.red(
          'AIA VSCode extension source not found. Skipping extension installation.'
        )
      );
      return;
    }

    try {
      // Ensure .vscode directory exists
      await fs.ensureDir(vscodeDir);

      // Copy the extension files (excluding node_modules and out folders)
      console.log(chalk.blue('Installing VSCode AIA extension...'));

      // Copy source files
      const srcDir = path.join(extensionRoot, 'src');
      const destSrcDir = path.join(extensionDestDir, 'src');
      if (await fs.pathExists(srcDir)) {
        await fs.copy(srcDir, destSrcDir);
        console.log(
          chalk.green(`Copied extension source files to ${destSrcDir}`)
        );
      }

      // Copy configuration files
      const configFiles = ['package.json', 'tsconfig.json'];
      for (const file of configFiles) {
        const srcFile = path.join(extensionRoot, file);
        const destFile = path.join(extensionDestDir, file);
        if (await fs.pathExists(srcFile)) {
          await fs.copy(srcFile, destFile);
          console.log(chalk.green(`Copied ${file}`));
        }
      }

      // Copy test files if they exist
      const testDir = path.join(extensionRoot, 'test');
      const destTestDir = path.join(extensionDestDir, 'test');
      if (await fs.pathExists(testDir)) {
        await fs.copy(testDir, destTestDir);
        console.log(chalk.green(`Copied test files to ${destTestDir}`));
      }

      // Copy resources if they exist
      const resourcesDir = path.join(extensionRoot, 'resources');
      const destResourcesDir = path.join(extensionDestDir, 'resources');
      if (await fs.pathExists(resourcesDir)) {
        await fs.copy(resourcesDir, destResourcesDir);
        console.log(chalk.green(`Copied resources to ${destResourcesDir}`));
      }

      // Install VSCode settings.json and tasks.json
      await this.installVSCodeConfiguration(projectRoot, extensionRoot);

      // Create a README for the extension
      const readmeContent = `# AIA VSCode Extension

This is the AIA Copilot Bridge extension that provides intelligent symbol indexing and context enhancement for GitHub Copilot.

## Setup

1. Install dependencies:
   \`\`\`bash
   cd .vscode/aia-copilot-bridge
   npm install
   \`\`\`

2. Compile the extension:
   \`\`\`bash
   npm run compile
   \`\`\`

3. Reload VSCode window to activate the extension.

## Features

- Real-time symbol indexing
- Automatic Copilot context updates
- Performance monitoring
- File watching and auto-updates

## Commands

- \`AIA: Update Symbol Index\` - Manually update the symbol index
- \`AIA: Update Copilot Context\` - Manually update Copilot context
- \`AIA: Show Performance Stats\` - Display performance metrics

The extension automatically activates when VSCode opens and monitors file changes to keep the symbol index and Copilot context up to date.
`;

      const readmePath = path.join(extensionDestDir, 'README.md');
      await fs.writeFile(readmePath, readmeContent);
      console.log(chalk.green(`Created ${readmePath}`));

      console.log(chalk.green('VSCode AIA extension installed successfully!'));

      if (autoSetup) {
        console.log(chalk.blue('Running automatic setup...'));
        await this.runExtensionSetup(extensionDestDir);
      } else {
        console.log(chalk.blue('To complete setup:'));
        console.log(chalk.white('  1. cd .vscode/aia-copilot-bridge'));
        console.log(chalk.white('  2. npm install'));
        console.log(chalk.white('  3. npm run compile'));
        console.log(chalk.white('  4. Reload VSCode window (Cmd+R or Ctrl+R)'));
        console.log(
          chalk.yellow('Or run: aia init --auto-setup to set up automatically')
        );
      }
    } catch (error) {
      console.log(chalk.red('Failed to install VSCode extension:'), error);
    }
  }

  private async installVSCodeConfiguration(
    projectRoot: string,
    extensionRoot: string
  ): Promise<void> {
    const vscodeDir = path.join(projectRoot, '.vscode');
    const sourceVSCodeDir = path.dirname(extensionRoot); // This should be .vscode

    try {
      // Copy settings.json if it doesn't exist
      const settingsSource = path.join(sourceVSCodeDir, 'settings.json');
      const settingsDest = path.join(vscodeDir, 'settings.json');

      if (
        (await fs.pathExists(settingsSource)) &&
        !(await fs.pathExists(settingsDest))
      ) {
        await fs.copy(settingsSource, settingsDest);
        console.log(
          chalk.green('Created .vscode/settings.json with AIA configuration')
        );
      } else if (await fs.pathExists(settingsDest)) {
        // Merge AIA settings into existing settings.json
        await this.mergeVSCodeSettings(settingsSource, settingsDest);
      }

      // Copy tasks.json if it doesn't exist
      const tasksSource = path.join(sourceVSCodeDir, 'tasks.json');
      const tasksDest = path.join(vscodeDir, 'tasks.json');

      if (
        (await fs.pathExists(tasksSource)) &&
        !(await fs.pathExists(tasksDest))
      ) {
        await fs.copy(tasksSource, tasksDest);
        console.log(chalk.green('Created .vscode/tasks.json with AIA tasks'));
      } else if (await fs.pathExists(tasksDest)) {
        console.log(
          chalk.yellow(
            '.vscode/tasks.json already exists - you may want to manually add AIA tasks'
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow('Could not install VSCode configuration files:'),
        error
      );
    }
  }

  private async mergeVSCodeSettings(
    sourceSettingsPath: string,
    destSettingsPath: string
  ): Promise<void> {
    try {
      if (!(await fs.pathExists(sourceSettingsPath))) {
        return;
      }

      const sourceSettings = await fs.readJSON(sourceSettingsPath);
      let destSettings = {};

      if (await fs.pathExists(destSettingsPath)) {
        destSettings = await fs.readJSON(destSettingsPath);
      }

      // Merge AIA-specific settings
      const mergedSettings = {
        ...destSettings,
        'aia.symbolIndex': sourceSettings['aia.symbolIndex'],
        'github.copilot.advanced': {
          ...(destSettings as any)['github.copilot.advanced'],
          ...sourceSettings['github.copilot.advanced'],
        },
        'files.watcherExclude': {
          ...(destSettings as any)['files.watcherExclude'],
          ...sourceSettings['files.watcherExclude'],
        },
        'search.exclude': {
          ...(destSettings as any)['search.exclude'],
          ...sourceSettings['search.exclude'],
        },
      };

      await fs.writeJSON(destSettingsPath, mergedSettings, { spaces: 2 });
      console.log(
        chalk.green('Merged AIA settings into existing .vscode/settings.json')
      );
    } catch (error) {
      console.log(chalk.yellow('Could not merge VSCode settings:'), error);
    }
  }

  private async runExtensionSetup(extensionDir: string): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      console.log(chalk.blue('Installing extension dependencies...'));
      await execAsync('npm install', { cwd: extensionDir });
      console.log(chalk.green('✅ Dependencies installed'));

      console.log(chalk.blue('Compiling extension...'));
      await execAsync('npm run compile', { cwd: extensionDir });
      console.log(chalk.green('✅ Extension compiled'));

      console.log(chalk.green('✅ Extension setup complete!'));
      console.log(
        chalk.blue('Please reload VSCode window to activate the extension')
      );
    } catch (error) {
      console.log(
        chalk.yellow('⚠️  Automatic setup failed. Please run setup manually:')
      );
      console.log(chalk.white('  1. cd .vscode/aia-copilot-bridge'));
      console.log(chalk.white('  2. npm install'));
      console.log(chalk.white('  3. npm run compile'));
      console.log(chalk.red('Error:'), error);
    }
  }

  // Add required ICommand methods
  public getDefinition(): CommandDefinition {
    return {
      name: this.name,
      description: this.description,
      aliases: this.aliases,
      usage: 'init [--skip-vscode] [--auto-setup]',
      examples: [
        'init',
        'init --skip-vscode',
        'init --auto-setup',
        'init --skip-vscode --auto-setup',
      ],
      options: [
        {
          name: '--skip-vscode',
          description: 'Skip VSCode extension installation',
          type: 'boolean',
        },
        {
          name: '--auto-setup',
          description:
            'Automatically install dependencies and compile the extension',
          type: 'boolean',
        },
      ],
    };
  }

  public getName(): string {
    return this.name;
  }

  public getAliases(): string[] {
    return this.aliases;
  }

  public validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    // No specific arguments for init
    return { valid: true, errors: [] };
  }

  public getHelp(): string {
    return `
Usage: ${this.name} [--skip-vscode] [--auto-setup]

${this.description}

Options:
  --skip-vscode    Skip VSCode extension installation
  --auto-setup     Automatically install dependencies and compile the extension

The init command sets up:
- AIA configuration files (.aia/)
- Documentation templates
- VSCode AIA extension (unless skipped)
- VSCode settings and tasks for optimal integration

Examples:
  aia init                     # Initialize with VSCode extension (manual setup)
  aia init --auto-setup        # Initialize with VSCode extension (automatic setup)
  aia init --skip-vscode       # Initialize without VSCode extension
`.trim();
  }
}
