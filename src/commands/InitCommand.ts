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

    // Read output directories from config
    const configPath = path.join(projectRoot, '.aia', 'config.json');
    let outputDirs: Record<string, string> = {};
    try {
      const cfg = await fs.readJSON(configPath);
      outputDirs = (cfg.outputDirectories as Record<string, string>) || {};
    } catch (err) {
      console.log(chalk.red('Error reading .aia/config.json:'), err);
      return { success: false, error: 'Failed to read config.json' };
    }

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

    // Copy documentation templates
    const docsTemplates: Array<[string, keyof typeof outputDirs]> = [
      ['copilot-instructions.md', 'copilotInstructions'],
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

    console.log(chalk.blue('AIA initialization complete.'));
    return { success: true };
  }

  // Add required ICommand methods
  public getDefinition(): CommandDefinition {
    return {
      name: this.name,
      description: this.description,
      aliases: this.aliases,
      usage: 'init',
      examples: ['init'],
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
Usage: ${this.name}

${this.description}
`.trim();
  }
}
