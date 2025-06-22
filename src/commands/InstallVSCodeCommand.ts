import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { CommandResult, CommandOptions } from '../types/index';

export class InstallVSCodeCommand implements ICommand {
  public readonly name = 'install-vscode-extension';
  public readonly description =
    'Install AIA VSCode extension in an existing project';
  public readonly aliases = ['install-ext', 'vscode'];

  public async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    const projectRoot = process.cwd();
    const vscodeExtensionRoot = path.resolve(
      __dirname,
      '../../.vscode/aia-copilot-bridge'
    );

    // Parse options
    const autoSetup = Boolean(
      args.includes('--auto-setup') || options.autoSetup
    );
    const force = Boolean(args.includes('--force') || options.force);

    // Check if VSCode extension already exists
    const extensionDestDir = path.join(
      projectRoot,
      '.vscode',
      'aia-copilot-bridge'
    );
    if ((await fs.pathExists(extensionDestDir)) && !force) {
      console.log(chalk.yellow('VSCode AIA extension already exists.'));
      console.log(chalk.white('Use --force to reinstall the extension.'));
      return { success: true };
    }

    // Check if source extension exists
    if (!(await fs.pathExists(vscodeExtensionRoot))) {
      console.log(
        chalk.red(
          'AIA VSCode extension source not found. Please ensure AIA CLI is properly installed.'
        )
      );
      return { success: false, error: 'Extension source not found' };
    }

    try {
      await this.installVSCodeExtension(
        projectRoot,
        vscodeExtensionRoot,
        autoSetup,
        force
      );

      console.log(
        chalk.green('✅ VSCode AIA extension installation complete!')
      );
      console.log(chalk.blue('📝 Extension Features:'));
      console.log(chalk.white('  • O(1) symbol lookup for GitHub Copilot'));
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

      return { success: true };
    } catch (error: any) {
      console.log(
        chalk.red('Failed to install VSCode extension:'),
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  private async installVSCodeExtension(
    projectRoot: string,
    extensionRoot: string,
    autoSetup: boolean = false,
    force: boolean = false
  ): Promise<void> {
    const vscodeDir = path.join(projectRoot, '.vscode');
    const extensionDestDir = path.join(vscodeDir, 'aia-copilot-bridge');

    // Remove existing extension if force is enabled
    if (force && (await fs.pathExists(extensionDestDir))) {
      console.log(chalk.yellow('Removing existing extension...'));
      await fs.remove(extensionDestDir);
    }

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

## Installation

This extension was installed by the AIA CLI. To reinstall or update:

\`\`\`bash
aia install-vscode-extension --force
\`\`\`
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
        chalk.yellow(
          'Or run: aia install-vscode-extension --auto-setup to set up automatically'
        )
      );
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
      usage: 'install-vscode-extension [--auto-setup] [--force]',
      examples: [
        'install-vscode-extension',
        'install-vscode-extension --auto-setup',
        'install-vscode-extension --force',
        'install-vscode-extension --auto-setup --force',
      ],
      options: [
        {
          name: '--auto-setup',
          description:
            'Automatically install dependencies and compile the extension',
          type: 'boolean',
        },
        {
          name: '--force',
          description: 'Force reinstallation even if extension already exists',
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
    // No specific arguments required
    return { valid: true, errors: [] };
  }

  public getHelp(): string {
    return `
Usage: ${this.name} [--auto-setup] [--force]

${this.description}

Options:
  --auto-setup     Automatically install dependencies and compile the extension
  --force          Force reinstallation even if extension already exists

This command installs the AIA VSCode extension in an existing project that wasn't
initialized with 'aia init' or where the extension was skipped.

Examples:
  aia install-vscode-extension                    # Install extension (manual setup)
  aia install-vscode-extension --auto-setup       # Install extension (automatic setup)  
  aia install-vscode-extension --force            # Reinstall existing extension
  aia install-ext --auto-setup --force            # Reinstall with automatic setup

Aliases: install-ext, vscode
`.trim();
  }
}
