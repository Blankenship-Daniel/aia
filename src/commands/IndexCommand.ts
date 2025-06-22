// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
import * as fs from 'fs-extra';
import * as path from 'path';

// Use require for inquirer to avoid module import issues
const inquirer = require('inquirer');

import { ICommand, CommandDefinition } from '../interfaces/ICommand.js';
import { CommandResult, CommandOptions, AsyncResult } from '../types/index.js';

// Import interfaces instead of concrete classes
import { ICodeIndexService } from '../interfaces/ICodeIndexService.js';
import { ISymbolIndex } from '../interfaces/ISymbolIndex.js';
import { ICodebaseSummarizer } from '../interfaces/ICodebaseSummarizer.js';
import { ISemanticCodeAnalyzer } from '../interfaces/ISemanticCodeAnalyzer.js';
import { IAIService } from '../interfaces/IAIService.js';
import ConfigurationManager from '../ConfigurationManager.js';

interface IndexStats {
  totalFiles: number;
  totalClasses: number;
  totalFunctions: number;
  totalTodos: number;
  languages: Record<string, number>;
  lastIndexed?: string;
  largestFiles?: Array<{ file: string; size: number }>;
}

interface SearchResult {
  type: 'class' | 'function';
  name: string;
  file: string;
  relevance: number;
}

interface FileResult {
  type: string;
  name: string;
  file: string;
  relevance: number;
}

interface TodoItem {
  file: string;
  line: number;
  text: string;
}

interface IndexData {
  files: Map<string, unknown>;
  classes: Map<string, unknown>;
  functions: Map<string, unknown>;
  todos: TodoItem[];
  metadata: {
    totalFiles: number;
    totalClasses: number;
    totalFunctions: number;
    totalTodos: number;
    languages: Record<string, number>;
    lastIndexed?: string;
  };
}

interface ExportResult {
  file: string;
  format: string;
  size: number;
}

interface ComponentInfo {
  file: string;
  purpose?: string;
  exports?: string[];
  importance?: number;
}

interface EntryPoint {
  file: string;
  purpose: string;
}

interface AnalysisResult {
  architecture: Array<{
    name: string;
    confidence: number;
    evidence: string[];
  }>;
  patterns: Array<{
    name: string;
    confidence: number;
    description: string;
  }>;
  quality: {
    score: number;
    factors: string[];
    suggestions: string[];
  };
}

// Added CodebaseIndex and related interfaces
interface CodebaseIndex {
  files: Map<string, FileInfo>;
  metadata: {
    totalFiles: number;
    linesOfCode: number;
    totalClasses: number;
    totalFunctions: number;
    languages: Record<string, number>;
    dependencies: Record<string, string[]>;
  };
  dependencies: Record<string, string[]>;
}

interface FileInfo {
  path: string;
  content?: string;
  exports?: string[];
  imports?: string[];
  classes?: string[];
  functions?: string[];
  type?: string;
  size?: number;
}

/**
 * IndexCommand class
 * 
 * TODO: Add class description
 */
export class IndexCommand implements ICommand {
  private name = 'index';
  private description = 'Create and manage codebase index for AI analysis';
  private aliases = ['idx', 'scan'];

  private codeIndexService: ICodeIndexService;
  private symbolIndexService: ISymbolIndex;
  private codebaseSummarizer: ICodebaseSummarizer;
  private semanticAnalyzer: ISemanticCodeAnalyzer;
  private aiService: IAIService;

  constructor(
    codeIndexService: ICodeIndexService,
    symbolIndexService: ISymbolIndex,
    codebaseSummarizer: ICodebaseSummarizer,
    semanticAnalyzer: ISemanticCodeAnalyzer,
    aiService: IAIService
  ) {
    this.codeIndexService = codeIndexService;
    this.symbolIndexService = symbolIndexService;
    this.codebaseSummarizer = codebaseSummarizer;
    this.semanticAnalyzer = semanticAnalyzer;
    this.aiService = aiService;
  }

  public async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const action = args[0] || 'build';

      switch (action.toLowerCase()) {
        case 'build':
        case 'create':
          return await this.buildIndex(options);

        case 'search':
          return await this.searchIndex(args.slice(1), options);

        case 'stats':
        case 'status':
          return await this.showStats(options);

        case 'summary':
          return await this.showSummary(options);

        case 'files':
          return await this.listFiles(args.slice(1), options);

        case 'symbols':
          return await this.listSymbols(args.slice(1), options);

        case 'todos':
          return await this.showTodos(args.slice(1), options);

        case 'refresh':
        case 'rebuild':
          return await this.refreshIndex(options);

        case 'analyze':
          return await this.analyzeCode(options);

        case 'export':
          return await this.exportIndex(args.slice(1), options);

        case 'prompts':
        case 'generate-prompts':
          return await this.generatePrompts(args.slice(1), options);

        // Symbol Index Actions (Phase 1)
        case 'symbols:build':
          return await this.buildSymbolLookup(options);

        case 'symbols:query':
          return await this.querySymbol(args.slice(1), options);

        case 'symbols:export':
          return await this.exportSymbolTable(args.slice(1), options);

        default:
          console.log(chalk.yellow(`Unknown action: ${action}`));
          console.log(chalk.blue('\nAvailable actions:'));
          console.log('  build     - Build/create the codebase index');
          console.log('  search    - Search the index for symbols or files');
          console.log('  stats     - Show index statistics');
          console.log('  summary   - Show AI-friendly codebase summary');
          console.log('  files     - List files by pattern');
          console.log('  symbols   - List symbols (classes, functions)');
          console.log('  todos     - Show TODO items');
          console.log('  refresh   - Rebuild the entire index');
          console.log('  analyze   - Perform semantic code analysis');
          console.log('  export    - Export index to file for AI prompts');
          console.log('  prompts   - Generate specialized AI prompt files');

          return { success: false, error: 'Invalid action' };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Index command error:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Builds index
   * 
   * @param options - Parameter description
   * 
   * @returns Promise<CommandResult> - Return value description
   */
  private async buildIndex(options: CommandOptions): Promise<CommandResult> {
    const startTime = Date.now();

    console.log(chalk.blue('🔍 Building codebase index...'));

    try {
      // Check if index exists
      const existingIndex = await this.codeIndexService.loadIndex();

      if (existingIndex && !options.force) {
        const { shouldRebuild } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldRebuild',
            message: 'Index already exists. Rebuild it?',
            default: false,
          },
        ]);

        if (!shouldRebuild) {
          return {
            success: true,
            output: 'Index rebuild cancelled',
          };
        }
      }

      const directory = (options.directory as string) || process.cwd();
      const index = await this.codeIndexService.indexCodebase(directory);

      const duration = Date.now() - startTime;
      const stats = this.codeIndexService.getIndexStats();

      console.log(chalk.green('\n✅ Codebase index built successfully!'));
      console.log(chalk.gray(`   Duration: ${duration}ms`));
      console.log(chalk.gray(`   Files indexed: ${stats.totalFiles}`));
      console.log(chalk.gray(`   Classes found: ${stats.totalClasses}`));
      console.log(chalk.gray(`   Functions found: ${stats.totalFunctions}`));
      console.log(chalk.gray(`   TODOs found: ${stats.totalTodos}`));

      if (options.verbose) {
        console.log(chalk.blue('\n📊 Language distribution:'));
        Object.entries(stats.languages).forEach(([lang, count]) => {
          console.log(chalk.gray(`   ${lang}: ${count} files`));
        });
      }

      return {
        success: true,
        output: 'Index built successfully',
        data: { stats, duration },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Failed to build index:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async searchIndex(
    query: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    if (query.length === 0) {
      console.log(chalk.yellow('Please provide a search query.'));
      console.log(chalk.blue('Usage: aia index search <query>'));
      return { success: false, error: 'No search query provided' };
    }

    const searchTerm = query.join(' ');

    try {
      // Load existing index
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, error: 'No index found' };
      }

      console.log(chalk.blue(`🔍 Searching for: "${searchTerm}"`));

      // Search symbols
      const symbolResults: SearchResult[] =
        this.codeIndexService.searchSymbols(searchTerm);

      // Search files
      const fileSearchResults = this.codeIndexService.searchFiles(searchTerm);
      const fileResults: FileResult[] = fileSearchResults.map((result) => ({
        type: 'file',
        name: path.basename(result.path),
        file: result.path,
        relevance: result.relevance,
      }));

      // Display results
      if (symbolResults.length > 0) {
        console.log(chalk.green('\n📁 Symbol Results:'));
        symbolResults.slice(0, 10).forEach((result) => {
          console.log(
            chalk.white(`  ${result.type}: ${result.name}`),
            chalk.gray(`(${result.file})`)
          );
        });
      }

      if (fileResults.length > 0) {
        console.log(chalk.green('\n📄 File Results:'));
        fileResults.slice(0, 10).forEach((result) => {
          console.log(
            chalk.white(`  ${result.name}`),
            chalk.gray(`(${result.file})`)
          );
        });
      }

      if (symbolResults.length === 0 && fileResults.length === 0) {
        console.log(chalk.yellow('No results found.'));
      }

      return {
        success: true,
        output: `Found ${symbolResults.length} symbols and ${fileResults.length} files`,
        data: { symbols: symbolResults, files: fileResults },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Search failed:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handles showStats operation
   * 
   * @param options - Parameter description
   * 
   * @returns Promise<CommandResult> - Return value description
   */
  private async showStats(options: CommandOptions): Promise<CommandResult> {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      const stats: IndexStats = this.codeIndexService.getIndexStats();

      console.log(chalk.blue.bold('\n📊 Codebase Index Statistics'));
      console.log(chalk.white(`Total Files: ${stats.totalFiles}`));
      console.log(chalk.white(`Classes: ${stats.totalClasses}`));
      console.log(chalk.white(`Functions: ${stats.totalFunctions}`));
      console.log(chalk.white(`TODO Items: ${stats.totalTodos}`));
      console.log(
        chalk.white(`Last Indexed: ${stats.lastIndexed || 'Unknown'}`)
      );
      if (stats.largestFiles?.length) {
        console.log(chalk.blue('\n📁 Largest Files:'));
        stats.largestFiles.forEach((file) => {
          console.log(
            chalk.white(`  ${file.file}`),
            chalk.gray(`(${file.size} bytes)`)
          );
        });
      }

      if (options.verbose) {
        console.log(chalk.blue('\n📊 Language distribution:'));
        Object.entries(stats.languages).forEach(([lang, count]) => {
          console.log(chalk.gray(`   ${lang}: ${count} files`));
        });
      }

      return {
        success: true,
        output: 'Stats displayed',
        data: stats,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Failed to show stats:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handles showSummary operation
   * 
   * @param options - Parameter description
   * 
   * @returns Promise<CommandResult> - Return value description
   */
  private async showSummary(options: CommandOptions): Promise<CommandResult> {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      console.log(chalk.blue('🤖 Generating AI-friendly summary...'));

      const codebaseIndex = this.convertToCodebaseIndex(index);
      const summaryData = await this.codebaseSummarizer.generateAISummary(
        codebaseIndex as any
      );

      if (options.json) {
        console.log(JSON.stringify(summaryData, null, 2));
        return {
          success: true,
          output: 'Summary generated',
          data: summaryData,
        };
      }

      console.log(chalk.blue.bold('\n📋 Codebase Summary'));
      console.log(
        chalk.white(`Project Type: ${summaryData.summary.overview.projectType}`)
      );
      console.log(
        chalk.white(
          `Primary Language: ${summaryData.summary.overview.primaryLanguage}`
        )
      );
      console.log(
        chalk.white(
          `Architecture: ${summaryData.summary.overview.architecture}`
        )
      );
      console.log(
        chalk.white(`Purpose: ${summaryData.summary.overview.purpose}`)
      );

      if (summaryData.summary.entryPoints.length > 0) {
        console.log(chalk.blue('\n🚪 Entry Points:'));
        summaryData.summary.entryPoints.forEach((entry: EntryPoint) => {
          console.log(chalk.gray(`  ${entry.file}: ${entry.purpose}`));
        });
      }

      if (summaryData.summary.keyComponents.length > 0) {
        console.log(chalk.blue('\n🔧 Key Components:'));
        summaryData.summary.keyComponents
          .slice(0, 5)
          .forEach((comp: ComponentInfo) => {
            console.log(chalk.gray(`  ${comp.file}: ${comp.purpose}`));
          });
      }

      if (options.verbose) {
        console.log(chalk.blue('\n💡 AI Context:'));
        // AIContext doesn't have prompt property, show something else
        console.log(
          chalk.gray(
            '  Suggested starting points: ' +
              summaryData.summary.aiContext.suggestedStartingPoints.join(', ')
          )
        );

        if (summaryData.summary.aiContext.importantFiles.length > 0) {
          console.log(chalk.blue('\n🔍 Important Files:'));
          summaryData.summary.aiContext.importantFiles.forEach(
            (file: string) => {
              console.log(chalk.gray(`  - ${file}`));
            }
          );
        }
      }

      return {
        success: true,
        output: 'Summary displayed',
        data: summaryData,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Failed to generate summary:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async listFiles(
    patterns: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      let files = Array.from((index as IndexData).files.entries());

      // Filter by patterns if provided
      if (patterns.length > 0) {
        const pattern = patterns.join(' ').toLowerCase();
        files = files.filter(
          ([path, info]: [string, any]) =>
            path.toLowerCase().includes(pattern) ||
            info.type.toLowerCase().includes(pattern) ||
            info.language.toLowerCase().includes(pattern)
        );
      }

      console.log(chalk.blue(`\n📄 Files (${files.length} total):`));

      // Group by type if verbose
      if (options.verbose) {
        const byType = new Map<string, string[]>();
        files.forEach(([path, info]: [string, any]) => {
          const type = info.type || 'unknown';
          if (!byType.has(type)) {
            byType.set(type, []);
          }
          byType.get(type)!.push(path);
        });

        for (const [type, filePaths] of Array.from(byType)) {
          console.log(chalk.blue(`\n${type} (${filePaths.length}):`));
          filePaths.slice(0, 10).forEach((filePath) => {
            console.log(chalk.gray(`  ${filePath}`));
          });
          if (filePaths.length > 10) {
            console.log(chalk.gray(`  ... and ${filePaths.length - 10} more`));
          }
        }
      } else {
        files.slice(0, 50).forEach(([path, info]: [string, any]) => {
          console.log(
            chalk.white(`  ${path}`),
            chalk.gray(`(${info.type || 'unknown'})`)
          );
        });

        if (files.length > 50) {
          console.log(chalk.gray(`  ... and ${files.length - 50} more files`));
        }
      }

      return {
        success: true,
        output: `Listed ${files.length} files`,
        data: { files },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Failed to list files:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async listSymbols(
    filters: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      const filter = filters.join(' ').toLowerCase();

      // Get classes
      let classes = Array.from((index as IndexData).classes.entries());
      if (filter) {
        classes = classes.filter(([name]) =>
          name.toLowerCase().includes(filter)
        );
      }

      // Get functions
      let functions = Array.from((index as IndexData).functions.entries());
      if (filter) {
        functions = functions.filter(([name]) =>
          name.toLowerCase().includes(filter)
        );
      }

      if (classes.length > 0) {
        console.log(chalk.blue(`\n🏗️  Classes (${classes.length}):`));
        classes.slice(0, 20).forEach(([name, info]: [string, any]) => {
          console.log(chalk.white(`  ${name}`), chalk.gray(`(${info.file})`));
        });

        if (classes.length > 20) {
          console.log(
            chalk.gray(`  ... and ${classes.length - 20} more classes`)
          );
        }
      }

      if (functions.length > 0) {
        console.log(chalk.blue(`\n⚡ Functions (${functions.length}):`));
        functions.slice(0, 20).forEach(([name, info]: [string, any]) => {
          console.log(chalk.white(`  ${name}`), chalk.gray(`(${info.file})`));
        });

        if (functions.length > 20) {
          console.log(
            chalk.gray(`  ... and ${functions.length - 20} more functions`)
          );
        }
      }

      if (classes.length === 0 && functions.length === 0) {
        console.log(chalk.yellow('No symbols found.'));
      }

      return {
        success: true,
        output: `Found ${classes.length} classes and ${functions.length} functions`,
        data: { classes, functions },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Failed to list symbols:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async showTodos(
    filters: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      const todos: TodoItem[] = this.codeIndexService.searchTodos(
        filters.join(' ')
      );

      if (todos.length === 0) {
        console.log(chalk.green('🎉 No TODO items found!'));
        return { success: true, output: 'No TODOs found', data: { todos: [] } };
      }

      console.log(chalk.blue(`\n📝 TODO Items (${todos.length} found):`));

      todos.slice(0, 20).forEach((todo) => {
        console.log(chalk.yellow(`  • ${todo.text}`));
        console.log(chalk.gray(`    ${todo.file}:${todo.line}`));
      });

      if (todos.length > 20) {
        console.log(chalk.gray(`  ... and ${todos.length - 20} more TODOs`));
      }

      return {
        success: true,
        output: `Found ${todos.length} TODO items`,
        data: { todos },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Failed to show TODOs:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handles refreshIndex operation
   * 
   * @param options - Parameter description
   * 
   * @returns Promise<CommandResult> - Return value description
   */
  private async refreshIndex(options: CommandOptions): Promise<CommandResult> {
    console.log(chalk.blue('🔄 Refreshing codebase index...'));

    // Force rebuild
    const refreshOptions = { ...options, force: true };
    return await this.buildIndex(refreshOptions);
  }

  /**
   * Analyzes code
   * 
   * @param options - Parameter description
   * 
   * @returns Promise<CommandResult> - Return value description
   */
  private async analyzeCode(options: CommandOptions): Promise<CommandResult> {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      console.log(chalk.blue('🧠 Performing semantic code analysis...'));

      const semanticAnalysis =
        await this.semanticAnalyzer.analyzeCodebaseSemantics(index);

      // Convert to expected format
      const analysis: AnalysisResult = {
        architecture: semanticAnalysis.architecture.map((pattern: any) => ({
          name: pattern.name,
          confidence: pattern.confidence,
          evidence: pattern.evidence.map((e: any) => e.indicator),
        })),
        patterns: semanticAnalysis.patterns.map((pattern: any) => ({
          name: pattern.name,
          confidence: pattern.confidence,
          description: pattern.name, // Using name as description for now
        })),
        quality: {
          score: semanticAnalysis.quality.maintainability / 100, // Normalize to 0-1
          factors: [
            `Complexity: ${semanticAnalysis.quality.complexity}`,
            `Maintainability: ${semanticAnalysis.quality.maintainability}%`,
            `Documentation: ${semanticAnalysis.quality.documentation}%`,
          ],
          suggestions: semanticAnalysis.quality.issues.map(
            (issue: any) =>
              `${issue.severity.toUpperCase()}: ${issue.type} issue`
          ),
        },
      };

      console.log(chalk.blue.bold('\n🏗️  Architecture Analysis'));
      if (analysis.architecture.length > 0) {
        analysis.architecture.forEach((arch) => {
          console.log(
            chalk.white(
              `  ${arch.name}: ${(arch.confidence * 100).toFixed(
                1
              )}% confidence`
            )
          );
          arch.evidence.forEach((evidence) => {
            console.log(chalk.gray(`    - ${evidence}`));
          });
        });
      } else {
        console.log(chalk.gray('  No clear architectural patterns detected'));
      }

      console.log(chalk.blue.bold('\n🎨 Design Patterns'));
      if (analysis.patterns.length > 0) {
        analysis.patterns.forEach((pattern) => {
          console.log(
            chalk.white(
              `  ${pattern.name}: ${(pattern.confidence * 100).toFixed(
                1
              )}% confidence`
            )
          );
          console.log(chalk.gray(`    ${pattern.description}`));
        });
      } else {
        console.log(chalk.gray('  No design patterns detected'));
      }

      console.log(chalk.blue.bold('\n📊 Code Quality'));
      console.log(
        chalk.white(
          `  Overall Score: ${(analysis.quality.score * 100).toFixed(1)}%`
        )
      );

      if (analysis.quality.factors.length > 0) {
        console.log(chalk.blue('\n📈 Quality Factors:'));
        analysis.quality.factors.forEach((factor) => {
          console.log(chalk.gray(`  ✓ ${factor}`));
        });
      }

      if (analysis.quality.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Suggestions:'));
        analysis.quality.suggestions.forEach((suggestion) => {
          console.log(chalk.yellow(`  • ${suggestion}`));
        });
      }

      return {
        success: true,
        output: 'Code analysis completed',
        data: analysis,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Failed to analyze code:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async exportIndex(
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, error: 'No index found' };
      }

      // Determine output file
      const outputFile =
        args[0] || (options.output as string) || 'codebase-prompt.md';
      const format = (options.format as string) || 'markdown';
      const includeCode = Boolean(options.code);
      const includeDetails = Boolean(options.detailed);

      console.log(chalk.blue('📤 Exporting codebase index...'));

      let content = '';

      if (format === 'markdown') {
        content = await this.generateMarkdownPrompt(index as IndexData, {
          includeCode,
          includeDetails,
        });
      } else if (format === 'json') {
        content = JSON.stringify(
          await this.generateStructuredPrompt(index as IndexData, {
            includeCode,
            includeDetails,
          }),
          null,
          2
        );
      } else if (format === 'text') {
        content = await this.generateTextPrompt(index as IndexData, {
          includeCode,
          includeDetails,
        });
      } else {
        return { success: false, error: `Unsupported format: ${format}` };
      }

      // Write to file
      const fullPath = path.resolve(outputFile);
      await fs.writeFile(fullPath, content, 'utf8');

      console.log(chalk.green(`✅ Codebase prompt exported to: ${fullPath}`));
      console.log(chalk.gray(`   Format: ${format}`));
      console.log(
        chalk.gray(`   Size: ${(content.length / 1024).toFixed(1)} KB`)
      );

      return {
        success: true,
        output: `Exported to ${fullPath}`,
        data: { file: fullPath, format, size: content.length },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Failed to export index:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async generateMarkdownPrompt(
    index: IndexData,
    options: { includeCode?: boolean; includeDetails?: boolean } = {}
  ): Promise<string> {
    const { includeCode, includeDetails } = options;
    let content = '';

    // Header
    content += '# Codebase Analysis\n\n';
    content += `*Generated on ${new Date().toISOString()}*\n\n`;

    // Project Overview
    const codebaseIndex = this.convertToCodebaseIndex(index);
    const summaryData = await this.codebaseSummarizer.generateAISummary(
      codebaseIndex as any
    );
    const summary = summaryData.summary;
    const overview = summary.overview || {};

    content += '## Project Overview\n\n';
    content += `- **Project Type**: ${
      overview.projectType || 'Node.js Application'
    }\n`;
    content += `- **Primary Language**: ${
      overview.primaryLanguage || 'JavaScript'
    }\n`;
    content += `- **Architecture**: ${
      overview.architecture || 'Service-Component Architecture'
    }\n`;
    content += `- **Purpose**: ${
      overview.purpose || 'Application Development'
    }\n\n`;

    // Statistics
    content += '## Codebase Statistics\n\n';
    content += `- **Total Files**: ${index.files.size}\n`;
    content += `- **Classes**: ${index.classes.size}\n`;
    content += `- **Functions**: ${index.functions.size}\n`;
    content += `- **TODO Items**: ${index.todos.length}\n\n`;

    // Language Distribution
    const langDist = this.codeIndexService.getLanguageDistribution();
    content += '## Language Distribution\n\n';
    for (const [lang, count] of Object.entries(langDist)) {
      content += `- **${lang}**: ${count} files\n`;
    }
    content += '\n';

    // Entry Points
    const entryPoints = summary.entryPoints || this.findEntryPoints(index);
    if (entryPoints && entryPoints.length > 0) {
      content += '## Entry Points\n\n';
      for (const entry of entryPoints) {
        const entryFile = typeof entry === 'string' ? entry : entry.file;
        const entryPurpose =
          typeof entry === 'string' ? 'Entry point' : entry.purpose;
        content += `- **${entryFile}** - ${entryPurpose}\n`;
      }
      content += '\n';
    }

    // Key Components
    const keyComponents =
      summary.keyComponents || this.findKeyComponents(index);
    if (keyComponents && keyComponents.length > 0) {
      content += '## Key Components\n\n';
      for (const component of keyComponents.slice(0, 10)) {
        content += `- **${component.file}** - ${component.purpose}\n`;
      }
      content += '\n';
    }

    // Architecture Analysis
    if (includeDetails) {
      const semanticAnalysis =
        await this.semanticAnalyzer.analyzeCodebaseSemantics(index);

      if (semanticAnalysis.architecture.length > 0) {
        content += '## Architecture Patterns\n\n';
        for (const arch of semanticAnalysis.architecture) {
          content += `### ${arch.name}\n`;
          content += `Confidence: ${(arch.confidence * 100).toFixed(1)}%\n\n`;
          content += 'Evidence:\n';
          for (const evidence of arch.evidence) {
            content += `- ${evidence.indicator}\n`;
          }
          content += '\n';
        }
      }

      if (semanticAnalysis.patterns.length > 0) {
        content += '## Design Patterns\n\n';
        for (const pattern of semanticAnalysis.patterns) {
          content += `### ${pattern.name}\n`;
          content += `${pattern.name}\n`; // Using name as description
          content += `Confidence: ${(pattern.confidence * 100).toFixed(
            1
          )}%\n\n`;
        }
      }
    }

    // Classes
    if (index.classes.size > 0) {
      content += '## Classes\n\n';
      let classCount = 0;
      for (const [className, classInfo] of Array.from(index.classes)) {
        if (classCount >= 20 && !includeDetails) break;
        content += `- **${className}** (${(classInfo as any).file})`;
        if ((classInfo as any).extends) {
          content += ` extends ${(classInfo as any).extends}`;
        }
        content += '\n';
        classCount++;
      }
      if (index.classes.size > 20 && !includeDetails) {
        content += `... and ${index.classes.size - 20} more classes\n`;
      }
      content += '\n';
    }

    // Functions
    if (index.functions.size > 0) {
      content += '## Functions\n\n';
      let funcCount = 0;
      for (const [funcName, funcInfo] of Array.from(index.functions)) {
        if (funcCount >= 30 && !includeDetails) break;
        content += `- **${funcName}** (${(funcInfo as any).file})`;
        if ((funcInfo as any).async) {
          content += ' - async';
        }
        content += '\n';
        funcCount++;
      }
      if (index.functions.size > 30 && !includeDetails) {
        content += `... and ${index.functions.size - 30} more functions\n`;
      } else {
        content += '\n';
      }
    }

    // TODOs
    if (index.todos.length > 0) {
      content += '## TODO Items\n\n';
      for (const todo of index.todos.slice(0, 10)) {
        content += `- **${todo.file}:${todo.line}** - ${todo.text}\n`;
      }
      if (index.todos.length > 10) {
        content += `... and ${index.todos.length - 10} more TODOs\n`;
      }
      content += '\n';
    }

    // Usage Instructions
    content += '## Usage Instructions\n\n';
    content +=
      'This codebase analysis can be used as context for AI assistants. ';
    content +=
      'It provides a comprehensive overview of the project structure, ';
    content += 'key components, and architectural patterns.\n\n';
    content += '### For Copilot Instructions:\n';
    content += '- Use the project overview and architecture information\n';
    content += '- Reference key components when making suggestions\n';
    content += '- Consider the primary language and frameworks\n\n';
    content += '### For Prompts:\n';
    content += '- Include relevant sections based on your specific needs\n';
    content += '- Reference specific classes/functions when asking questions\n';
    content += '- Use TODO items to understand areas needing attention\n\n';

    return content;
  }

  private async generateStructuredPrompt(
    index: IndexData,
    options: { includeCode?: boolean; includeDetails?: boolean } = {}
  ): Promise<Record<string, unknown>> {
    const { includeCode, includeDetails } = options;
    const codebaseIndex = this.convertToCodebaseIndex(index);
    const summaryData = await this.codebaseSummarizer.generateAISummary(
      codebaseIndex as any
    );

    const structured = {
      metadata: {
        generated: new Date().toISOString(),
        totalFiles: index.files.size,
        totalClasses: index.classes.size,
        totalFunctions: index.functions.size,
        totalTodos: index.todos.length,
      },
      project: {
        type: summaryData.summary.overview.projectType,
        primaryLanguage: summaryData.summary.overview.primaryLanguage,
        architecture: summaryData.summary.overview.architecture,
        purpose: summaryData.summary.overview.purpose,
      },
      languages: this.codeIndexService.getLanguageDistribution(),
      entryPoints: summaryData.summary.entryPoints || [],
      keyComponents: (summaryData.summary.keyComponents || []).slice(0, 10),
      classes: Array.from(index.classes.entries())
        .slice(0, includeDetails ? -1 : 20)
        .map(([name, info]: [string, any]) => ({
          name,
          file: info.file,
          extends: info.extends,
          methods: info.methods || [],
        })),
      functions: Array.from(index.functions.entries())
        .slice(0, includeDetails ? -1 : 30)
        .map(([name, info]: [string, any]) => ({
          name,
          file: info.file,
          async: info.async || false,
        })),
      todos: index.todos.slice(0, includeDetails ? -1 : 10),
    };

    if (includeDetails) {
      const analysis = await this.semanticAnalyzer.analyzeCodebaseSemantics(
        index
      );
      (structured as any).analysis = {
        architecture: analysis.architecture,
        patterns: analysis.patterns,
        quality: analysis.quality,
      };
    }

    return structured;
  }

  private async generateTextPrompt(
    index: IndexData,
    options: { includeCode?: boolean; includeDetails?: boolean } = {}
  ): Promise<string> {
    const { includeCode, includeDetails } = options;
    let content = '';

    content += 'CODEBASE ANALYSIS\n';
    content += '=================\n\n';

    const codebaseIndex = this.convertToCodebaseIndex(index);
    const summaryData = await this.codebaseSummarizer.generateAISummary(
      codebaseIndex as any
    );

    content += `Project Type: ${summaryData.summary.overview.projectType}\n`;
    content += `Primary Language: ${summaryData.summary.overview.primaryLanguage}\n`;
    content += `Architecture: ${summaryData.summary.overview.architecture}\n`;
    content += `Purpose: ${summaryData.summary.overview.purpose}\n\n`;

    content += `Statistics:\n`;
    content += `- Files: ${index.files.size}\n`;
    content += `- Classes: ${index.classes.size}\n`;
    content += `- Functions: ${index.functions.size}\n`;
    content += `- TODOs: ${index.todos.length}\n\n`;

    const langDist = this.codeIndexService.getLanguageDistribution();
    content += 'Languages:\n';
    for (const [lang, count] of Object.entries(langDist)) {
      content += `- ${lang}: ${count} files\n`;
    }
    content += '\n';

    if (
      summaryData.summary.entryPoints &&
      summaryData.summary.entryPoints.length > 0
    ) {
      content += 'Entry Points:\n';
      for (const entry of summaryData.summary.entryPoints) {
        content += `- ${entry.file}: ${entry.purpose}\n`;
      }
      content += '\n';
    }

    if (index.classes.size > 0) {
      content += 'Key Classes:\n';
      let count = 0;
      for (const [name, info] of Array.from(index.classes)) {
        if (count >= 15) break;
        content += `- ${name} (${(info as any).file})\n`;
        count++;
      }
      content += '\n';
    }

    return content;
  }

  private async generatePrompts(
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, error: 'No index found' };
      }

      // Auto-build or refresh symbol index for enhanced prompt generation
      console.log(chalk.blue('🔍 Ensuring symbol index is up-to-date...'));
      try {
        const symbolResult = await this.buildSymbolLookup({
          directory: options.directory,
          force: Boolean(options.force), // Use the force option from user
          verbose: options.verbose || false,
        } as CommandOptions);

        if (!symbolResult.success) {
          console.log(
            chalk.yellow(
              '⚠️  Symbol index build failed, proceeding with basic index only'
            )
          );
        } else {
          console.log(
            chalk.green('✅ Symbol index ready for enhanced prompt generation')
          );
        }
      } catch (error) {
        console.log(
          chalk.yellow(
            `⚠️  Symbol index error: ${
              error instanceof Error ? error.message : 'Unknown error'
            }, proceeding with basic index only`
          )
        );
      }

      // Load configuration to get output directories
      const localConfigDir = path.join(process.cwd(), '.aia');
      const localConfigFile = path.join(localConfigDir, 'config.json');

      let configManager: any;
      if (await fs.pathExists(localConfigFile)) {
        // Use local config directory if it exists
        configManager = new ConfigurationManager(localConfigDir);
      } else {
        // Use default config directory (user's home/.aia)
        configManager = new ConfigurationManager();
      }

      await configManager.initialize();
      const config = await configManager.getConfig();

      const type = (options.type as string) || 'all';
      const explicitOutputDir = options.output as string; // Keep track of whether user provided explicit output

      // Helper function to get the output directory for a file type
      const getOutputDir = (fileType: string): string => {
        // If user provided explicit output directory, use it
        if (explicitOutputDir) {
          console.log(
            'DEBUG: Using explicit output directory:',
            explicitOutputDir
          );
          return explicitOutputDir;
        }

        // Otherwise, use configured output directories
        if (config.outputDirectories) {
          let configuredDir = '.';
          switch (fileType) {
            case 'copilot-instructions':
              configuredDir =
                config.outputDirectories.copilotInstructions || '.';
              break;
            case 'comprehensive':
              configuredDir = config.outputDirectories.comprehensive || '.';
              break;
            case 'minimal':
              configuredDir = config.outputDirectories.minimal || '.';
              break;
            case 'architecture':
              configuredDir = config.outputDirectories.architecture || '.';
              break;
            case 'dev-focused':
              configuredDir = config.outputDirectories.developer || '.';
              break;
            default:
              configuredDir = config.outputDirectories.prompts || '.';
          }
          return configuredDir;
        }

        return '.';
      };

      console.log(
        chalk.blue('📝 Generating AI prompt files with enhanced symbol data...')
      );

      const results: ExportResult[] = [];

      // Gather enhanced symbol data for prompt generation
      const symbolData = await this.gatherSymbolEnhancements();

      if (type === 'all') {
        const types = [
          // 'copilot-instructions',
          'comprehensive',
          'minimal',
          'architecture',
          'dev-focused',
        ];
        for (const promptType of types) {
          const content = await this.generateEnhancedPromptFile(
            promptType,
            Boolean(options.code),
            symbolData
          );
          const outputDir = getOutputDir(promptType);
          const filename =
            promptType === 'copilot-instructions'
              ? 'copilot-instructions.md'
              : `codebase-${promptType}.md`;
          const fullPath = path.join(outputDir, filename);

          await fs.ensureDir(outputDir);
          await fs.writeFile(fullPath, content, 'utf8');

          results.push({
            file: fullPath,
            format: 'markdown',
            size: content.length,
          });

          console.log(chalk.green(`✅ Generated: ${fullPath}`));
        }
      } else {
        const content = await this.generateEnhancedPromptFile(
          type,
          Boolean(options.code),
          symbolData
        );
        const outputDir = getOutputDir(type);
        const filename =
          type === 'copilot-instructions'
            ? 'copilot-instructions.md'
            : `codebase-${type}.md`;
        const fullPath = path.join(outputDir, filename);

        await fs.ensureDir(outputDir);
        await fs.writeFile(fullPath, content, 'utf8');

        results.push({
          file: fullPath,
          format: 'markdown',
          size: content.length,
        });

        console.log(chalk.green(`✅ Generated: ${fullPath}`));
      }

      const totalSize = results.reduce((sum, file) => sum + file.size, 0);

      console.log(
        chalk.gray(`   Total size: ${(totalSize / 1024).toFixed(1)} KB`)
      );

      return {
        success: true,
        output: `Generated ${results.length} prompt files`,
        data: { files: results, totalSize },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Failed to generate prompts:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // ICommand interface implementation methods

  /**
   * Gets definition
   * 
   * @returns CommandDefinition - Return value description
   */
  getDefinition(): CommandDefinition {
    return {
      name: this.name,
      description: this.description,
      usage: 'index <action> [options]',
      examples: [
        'index build',
        'index search "UserService"',
        'index symbols:build',
        'index symbols:query "MyClass"',
        'index symbols:export symbol-table.json',
      ],
      aliases: this.aliases,
      options: [
        {
          name: 'force',
          description: 'Force rebuild even if index exists',
          type: 'boolean',
        },
        {
          name: 'directory',
          description: 'Directory to index (default: current)',
          type: 'string',
        },
        {
          name: 'verbose',
          description: 'Show detailed output',
          type: 'boolean',
        },
        {
          name: 'json',
          description: 'Output results as JSON',
          type: 'boolean',
        },
        {
          name: 'format',
          description: 'Output format (json, markdown)',
          type: 'string',
        },
      ],
    };
  }

  /**
   * Gets name
   * 
   * @returns string - Return value description
   */
  getName(): string {
    return this.name;
  }

  /**
   * Gets aliases
   * 
   * @returns string[] - Return value description
   */
  getAliases(): string[] {
    return this.aliases;
  }

  /**
   * Validates args
   * 
   * @param args - Parameter description
   * 
   * @returns  - Return value description
   */
  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (args.length === 0) {
      // Default to 'build' action, which is valid
      return { valid: true, errors: [] };
    }

    const action = args[0];
    const validActions = [
      'build',
      'create',
      'search',
      'stats',
      'status',
      'summary',
      'files',
      'symbols',
      'todos',
      'refresh',
      'rebuild',
      'analyze',
      'export',
      'prompts',
      'generate-prompts',
      'symbols:build',
      'symbols:query',
      'symbols:export',
    ];

    if (!validActions.includes(action)) {
      errors.push(
        `Unknown action: ${action}. Valid actions: ${validActions.join(', ')}`
      );
    }

    // Action-specific validation
    if (
      (action === 'search' || action === 'symbols:query') &&
      args.length < 2
    ) {
      errors.push(`Action '${action}' requires a search term or symbol name`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Gets help
   * 
   * @returns string - Return value description
   */
  getHelp(): string {
    return `
  Usage: aia index <action> [options]

  Create and manage codebase index for AI analysis.

  Actions:
    build|create       Build or create the codebase index
    search              Search the index for symbols or files
    stats|status         Show index statistics
    summary             Show AI-friendly codebase summary
    files               List files by pattern
    symbols             List symbols (classes, functions)
    todos               Show TODO items
    refresh|rebuild     Rebuild the entire index
    analyze             Perform semantic code analysis
    export              Export index to file for AI prompts
    prompts|generate-prompts  Generate specialized AI prompt files

  Symbol Index Actions (Phase 1):
    symbols:build       Build optimized symbol lookup table
    symbols:query       Query symbol information
    symbols:export      Export symbol lookup table

  Options:
    --force             Force rebuild even if index exists
    --directory <path>  Directory to index (default: current)
    --verbose            Show detailed output
    --json               Output results as JSON
    --format <type>     Output format (json, markdown)

  Examples:
    aia index build
    aia index search "UserService"
    aia index symbols:build
    aia index symbols:query "MyClass"
    aia index symbols:export symbol-table.json
    `;
  }

  // Symbol Index Methods (Phase 1 Implementation)

  /**
   * Build optimized symbol lookup table
   */
  private async buildSymbolLookup(
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      console.log(chalk.blue('🔍 Building optimized symbol lookup table...'));

      const rootDir = (options.directory as string) || process.cwd();
      const symbolTable = await this.symbolIndexService.buildSymbolIndex(
        rootDir,
        {
          excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
          useCache: !options.force,
          force: Boolean(options.force),
        }
      );

      console.log(chalk.green('✅ Symbol lookup table built successfully!'));
      console.log(
        chalk.gray(
          `   Symbols indexed: ${Object.keys(symbolTable.symbols).length}`
        )
      );
      console.log(
        chalk.gray(
          `   Files processed: ${Object.keys(symbolTable.fileSymbols).length}`
        )
      );
      console.log(
        chalk.gray(
          `   Relationships mapped: ${
            Object.keys(symbolTable.relationships).length
          }`
        )
      );

      return {
        success: true,
        output: `Symbol lookup table built with ${
          Object.keys(symbolTable.symbols).length
        } symbols`,
        data: { symbolTable },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Symbol lookup build failed:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Query symbol information
   */
  private async querySymbol(
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const symbolName = args[0];
      if (!symbolName) {
        console.log(chalk.yellow('Please provide a symbol name to query'));
        return { success: false, error: 'Symbol name required' };
      }

      console.log(chalk.blue(`🔍 Querying symbol: ${symbolName}`));

      const symbolInfo = this.symbolIndexService.getSymbol(symbolName);
      if (!symbolInfo) {
        console.log(chalk.yellow(`Symbol '${symbolName}' not found in index`));
        return { success: false, error: 'Symbol not found' };
      }

      // Display symbol information
      console.log(chalk.green(`\n📋 Symbol Information: ${symbolName}`));
      console.log(chalk.white(`Type: ${symbolInfo.type}`));
      console.log(chalk.white(`Definitions: ${symbolInfo.definitions.length}`));
      console.log(chalk.white(`References: ${symbolInfo.references.length}`));

      if (symbolInfo.definitions.length > 0) {
        console.log(chalk.blue('\n📍 Definition:'));
        const def = symbolInfo.definitions[0];
        console.log(
          chalk.gray(
            `  ${def.location.file}:${def.location.line}:${def.location.column}`
          )
        );
        if (def.snippet) {
          console.log(chalk.gray(`  ${def.snippet}`));
        }
      }

      if (options.verbose && symbolInfo.references.length > 0) {
        console.log(chalk.blue('\n🔗 References:'));
        symbolInfo.references.slice(0, 5).forEach((ref) => {
          console.log(
            chalk.gray(
              `  ${ref.location.file}:${ref.location.line} - ${
                ref.context || 'usage'
              }`
            )
          );
        });
        if (symbolInfo.references.length > 5) {
          console.log(
            chalk.gray(
              `  ... and ${symbolInfo.references.length - 5} more references`
            )
          );
        }
      }

      return {
        success: true,
        output: `Found symbol ${symbolName}`,
        data: { symbol: symbolInfo },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Symbol query failed:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Export symbol lookup table for AI consumption
   */
  private async exportSymbolTable(
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const outputFile = args[0] || 'symbol-table.json';
      const format = options.format || 'json';

      console.log(chalk.blue('📤 Exporting symbol lookup table...'));

      // For now, get a basic export. In Phase 2+, this will be more sophisticated
      const symbols = this.symbolIndexService.findSymbolsByType('class');
      const functions = this.symbolIndexService.findSymbolsByType('function');

      const exportData = {
        metadata: {
          timestamp: new Date().toISOString(),
          format,
          version: '1.0.0',
        },
        symbols: {
          classes: symbols.map((name) => ({
            name,
            info: this.symbolIndexService.getSymbol(name),
          })),
          functions: functions.map((name) => ({
            name,
            info: this.symbolIndexService.getSymbol(name),
          })),
        },
        statistics: {
          totalSymbols: symbols.length + functions.length,
          classes: symbols.length,
          functions: functions.length,
        },
      };

      const content = JSON.stringify(exportData, null, 2);
      await fs.writeFile(outputFile, content, 'utf-8');

      console.log(chalk.green(`✅ Symbol table exported to: ${outputFile}`));
      console.log(chalk.gray(`   Format: ${format}`));
      console.log(
        chalk.gray(`   Size: ${(content.length / 1024).toFixed(1)} KB`)
      );
      console.log(
        chalk.gray(`   Symbols: ${exportData.statistics.totalSymbols}`)
      );

      return {
        success: true,
        output: `Exported to ${outputFile}`,
        data: { file: outputFile, statistics: exportData.statistics },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Export failed:'), errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Convert index data to codebase index format
   */
  private convertToCodebaseIndex(index: IndexData): any {
    return {
      files: index.files || new Map(),
      classes: index.classes || new Map(),
      functions: index.functions || new Map(),
      metadata: index.metadata || {},
      symbols: new Map(),
      dependencies: new Map(),
      imports: new Map(),
      exports: new Map(),
      constants: new Map(),
      comments: new Map(),
      todos: index.todos || [],
    };
  }

  /**
   * Find entry points in the codebase
   */
  private findEntryPoints(index: IndexData): string[] {
    const entryPoints: string[] = [];

    // Look for main entry files
    const commonEntryFiles = [
      'main.js',
      'index.js',
      'app.js',
      'server.js',
      'main.ts',
      'index.ts',
    ];

    if (index.files) {
      for (const [filePath] of index.files) {
        const fileName = path.basename(filePath);
        if (commonEntryFiles.includes(fileName)) {
          entryPoints.push(filePath);
        }
      }
    }

    return entryPoints.length > 0
      ? entryPoints
      : ['No clear entry points found'];
  }

  /**
   * Find key components in the codebase
   */
  private findKeyComponents(index: IndexData): string[] {
    const keyComponents: string[] = [];

    // Look for important classes and services
    if (index.classes) {
      for (const [className] of index.classes) {
        // Add classes that seem important (services, managers, etc.)
        if (
          className.includes('Service') ||
          className.includes('Manager') ||
          className.includes('Controller') ||
          className.includes('Engine')
        ) {
          keyComponents.push(className);
        }
      }
    }

    return keyComponents.length > 0
      ? keyComponents
      : ['No key components identified'];
  }

  /**
   * Gather enhanced symbol data for prompt generation
   */
  private async gatherSymbolEnhancements(): Promise<any> {
    try {
      // Get all symbol types for cross-reference mapping
      const classes = this.symbolIndexService.findSymbolsByType('class');
      const functions = this.symbolIndexService.findSymbolsByType('function');
      const interfaces = this.symbolIndexService.findSymbolsByType('interface');
      const types = this.symbolIndexService.findSymbolsByType('type');

      // Build relationship maps
      const symbolRelationships: Record<string, any> = {};
      const crossReferences: Record<string, string[]> = {};
      const usagePatterns: Record<string, any> = {};

      // Gather detailed symbol information
      for (const symbolName of [
        ...classes,
        ...functions,
        ...interfaces,
        ...types,
      ]) {
        const symbolInfo = this.symbolIndexService.getSymbol(symbolName);
        if (symbolInfo) {
          // Debug: log symbol info for first few symbols
          if (symbolName === classes[0] || symbolName === functions[0]) {
            console.log(
              chalk.cyan(
                `    🔍 Sample symbol "${symbolName}": ${
                  symbolInfo.references?.length || 0
                } references, ${
                  symbolInfo.definitions?.length || 0
                } definitions`
              )
            );
          }

          symbolRelationships[symbolName] = {
            type: symbolInfo.type,
            definitions: symbolInfo.definitions?.length || 0,
            references: symbolInfo.references?.length || 0,
            files:
              symbolInfo.definitions?.map((def) => def.location.file) || [],
            usageContext:
              symbolInfo.references?.slice(0, 5).map((ref) => ({
                file: ref.location.file,
                context: ref.context || 'usage',
              })) || [],
          };

          // Build cross-references
          const relatedSymbols =
            symbolInfo.references
              ?.map((ref) => ref.location.file)
              .filter((file, index, arr) => arr.indexOf(file) === index) || [];
          crossReferences[symbolName] = relatedSymbols;

          // Analyze usage patterns
          if (symbolInfo.references && symbolInfo.references.length > 0) {
            usagePatterns[symbolName] = {
              totalUsages: symbolInfo.references.length,
              filesUsedIn: relatedSymbols.length,
              averageUsagePerFile:
                symbolInfo.references.length /
                Math.max(relatedSymbols.length, 1),
              commonContexts: symbolInfo.references
                .map((ref) => ref.context)
                .filter(Boolean)
                .reduce((acc: Record<string, number>, context: string) => {
                  acc[context] = (acc[context] || 0) + 1;
                  return acc;
                }, {}),
            };
          }
        }
      }

      // Debug: log usage patterns found
      console.log(
        chalk.cyan(
          `    📊 Usage patterns found: ${Object.keys(usagePatterns).length}`
        )
      );
      if (Object.keys(usagePatterns).length > 0) {
        const topUsed = Object.entries(usagePatterns)
          .sort(
            ([, a], [, b]) => (b as any).totalUsages - (a as any).totalUsages
          )
          .slice(0, 3);
        console.log(
          chalk.cyan(
            `    🔝 Top used: ${topUsed
              .map(([name, data]) => `${name}(${(data as any).totalUsages})`)
              .join(', ')}`
          )
        );
      }

      return {
        totalSymbols:
          classes.length + functions.length + interfaces.length + types.length,
        symbolCounts: {
          classes: classes.length,
          functions: functions.length,
          interfaces: interfaces.length,
          types: types.length,
        },
        symbolRelationships,
        crossReferences,
        usagePatterns,
        mostUsedSymbols: Object.entries(usagePatterns)
          .sort(
            ([, a], [, b]) => (b as any).totalUsages - (a as any).totalUsages
          )
          .slice(0, 10)
          .map(([name]) => name),
        keyArchitecturalComponents: classes.filter(
          (name) =>
            name.includes('Service') ||
            name.includes('Manager') ||
            name.includes('Controller') ||
            name.includes('Engine') ||
            name.includes('Factory') ||
            name.includes('Provider')
        ),
      };
    } catch (error) {
      console.warn(
        chalk.yellow(
          '⚠️  Could not gather symbol enhancements, falling back to basic data'
        )
      );
      return {
        totalSymbols: 0,
        symbolCounts: { classes: 0, functions: 0, interfaces: 0, types: 0 },
        symbolRelationships: {},
        crossReferences: {},
        usagePatterns: {},
        mostUsedSymbols: [],
        keyArchitecturalComponents: [],
      };
    }
  }

  /**
   * Generate enhanced prompt file with symbol data integration
   */
  private async generateEnhancedPromptFile(
    type: string,
    includeCode: boolean,
    symbolData: any
  ): Promise<string> {
    console.log(
      chalk.cyan(
        `🤖 Generating fully AI-powered ${type} file with complete GenAI generation...`
      )
    );

    try {
      // Check if AI service is configured
      if (!this.aiService.isConfigured()) {
        console.log(
          chalk.yellow(
            '⚠️  AI service not configured, falling back to basic template'
          )
        );
        // Fallback to basic template generation
        return await this.codeIndexService.generatePromptFile(
          type,
          includeCode
        );
      }

      console.log(
        chalk.cyan('🤖 Requesting complete AI generation of documentation...')
      );

      // Generate 100% AI-powered content
      const aiGeneratedContent = await this.generateCompleteAIContent(
        symbolData,
        type
      );

      if (aiGeneratedContent.trim()) {
        console.log(
          chalk.green(
            `✅ Fully AI-generated ${type} file created (${aiGeneratedContent.length} characters)`
          )
        );
        return aiGeneratedContent;
      } else {
        console.log(
          chalk.yellow('⚠️  AI generation failed, using template fallback')
        );
        // Fallback to template if AI fails
        return await this.codeIndexService.generatePromptFile(
          type,
          includeCode
        );
      }
    } catch (error) {
      console.warn(
        chalk.yellow(
          `⚠️  AI generation failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }, using template fallback`
        )
      );
      // Fallback to basic prompt generation
      return await this.codeIndexService.generatePromptFile(type, includeCode);
    }
  }

  /**
   * Generate complete AI-powered documentation content with no templates
   */
  private async generateCompleteAIContent(
    symbolData: any,
    promptType: string
  ): Promise<string> {
    try {
      // Create a comprehensive generation prompt for the AI
      const generationPrompt = this.createCompleteGenerationPrompt(
        symbolData,
        promptType
      );

      console.log(
        chalk.cyan(`🧠 Requesting ${promptType} generation from AI...`)
      );

      // Use AIService with intelligent model selection for complete generation
      const contextInfo = {
        workingDirectory: process.cwd(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        user: process.env.USER || 'unknown',
        shell: process.env.SHELL || 'unknown',
        timestamp: new Date().toISOString(),
        projectType: 'typescript-nodejs',
        projectInfo: { name: 'AIA CLI', type: 'typescript' },
        gitStatus: 'unknown',
        environmentScore: 100,
      };

      // Let the AI service select the best model for generation
      const selectedModel = this.aiService.selectModel(
        generationPrompt,
        contextInfo
      );

      const aiResponse = await this.aiService.queryAI(
        generationPrompt,
        contextInfo,
        selectedModel
      );

      if (aiResponse.content) {
        console.log(
          chalk.green(
            `✅ AI content generation completed using ${aiResponse.model}`
          )
        );
        return aiResponse.content;
      } else {
        console.log(chalk.yellow('⚠️  AI generation returned empty response'));
        return '';
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `⚠️  AI content generation error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      );
      return '';
    }
  }

  /**
   * Create comprehensive generation prompts for complete AI-driven file creation
   */
  private createCompleteGenerationPrompt(
    symbolData: any,
    promptType: string
  ): string {
    const codebaseContext = this.buildCodebaseContext(symbolData);
    const projectDetails = this.buildProjectDetails();

    const prompts: Record<string, string> = {
      'copilot-instructions': `You are a technical documentation expert. Create a comprehensive GitHub Copilot instructions file for this TypeScript/Node.js CLI project.

${codebaseContext}

${projectDetails}

Generate a complete copilot-instructions.md file with the following sections:

# Copilot Instructions for AI Assistant

## Table of Contents
Include all major sections you'll create.

## Role
Define the AI assistant's role for this specific codebase.

## Project Overview
- Project name, type, and purpose
- Architecture summary (Service-Oriented Architecture with Dependency Injection)
- Scale and statistics
- Core capabilities

## Architecture Patterns
- Service-Oriented Architecture details
- Dependency Injection patterns
- Command Pattern implementation
- Key architectural components

## Directory Structure
Provide the actual directory structure based on the project type.

## Key Components & Relationships
Document the major services, commands, and their relationships using the ACTUAL symbol data provided above. Include real class names and their usage patterns.

## Code Navigation Guidelines
Specific guidance for navigating this codebase using the actual architectural components listed above.

## Common Patterns
Show actual code patterns used in this project with examples. Use the specific component names and relationships from the symbol analysis above.

## Interactive Examples
Provide realistic examples for this CLI tool using the actual command classes and services identified in the symbol data.

## Development Workflow
Step-by-step guidance for adding features to this codebase, referencing the specific architectural components and patterns identified above.

## Common Development Scenarios
Real scenarios developers face with this codebase.

## Performance Considerations
Specific to this project's architecture.

## Guidelines
Specific rules for working with this codebase.

Create a professional, comprehensive, and actionable document that helps developers work effectively with GitHub Copilot on this specific codebase. Include real TypeScript code examples and practical guidance throughout.

IMPORTANT: Use the specific symbol data provided above (Key Components, Most Referenced Symbols, etc.) to make the documentation concrete and specific to this actual codebase. Reference real class names, service names, and architectural components from the symbol analysis.`,

      comprehensive: `You are a senior technical architect. Create a comprehensive technical documentation file for this TypeScript/Node.js CLI project.

${codebaseContext}

${projectDetails}

Generate a complete codebase-comprehensive.md file covering:

# Complete Codebase Analysis

## Overview
Detailed project overview including purpose, architecture, and scale.

## Project Statistics
File counts, language distribution, complexity metrics.

## Technical Architecture
- Service-oriented architecture analysis
- Component relationships
- Design patterns implementation
- Integration points

## Code Quality Assessment
- SOLID principles adherence
- Design pattern usage
- Technical debt analysis
- Maintainability concerns

## Scalability Analysis
- Current architecture limitations
- Growth opportunities
- Performance bottlenecks
- Scaling strategies

## Integration Patterns
- Service communication
- Data flow analysis
- Error handling strategies
- Monitoring and observability

## Testing Strategy
- Current test coverage
- Testing patterns
- Recommended improvements
- Quality assurance

## Security Considerations
- API security
- Data protection
- Authentication patterns
- Vulnerability assessment

## Deployment Architecture
- Build process
- Distribution strategy
- Environment management
- CI/CD recommendations

## Future Roadmap
- Technical evolution
- Architecture improvements
- Technology upgrades
- Strategic recommendations

Provide strategic insights that help technical stakeholders understand the system's current state and future potential.`,

      minimal: `You are a technical writer specializing in concise documentation. Create a minimal but effective project context file for this TypeScript/Node.js CLI project.

${codebaseContext}

${projectDetails}

Generate a complete codebase-minimal.md file that includes:

# TypeScript CLI Project Context

## Quick Overview
Project type, language, and core purpose in 2-3 sentences.

## Key Statistics
- File count
- Primary language
- Architecture type
- Entry points

## Essential Components
List only the most critical files and components.

## Core Commands
The main CLI commands available.

## Quick Start
Essential commands to get started:
\`\`\`bash
npm install
npm run build
npm start
\`\`\`

## Development Essentials
Key files developers need to know about.

## Architecture Summary
One paragraph explaining the architecture.

Keep it concise but complete - essential information only.`,

      architecture: `You are a solutions architect. Create a detailed architecture documentation file for this TypeScript/Node.js CLI project.

${codebaseContext}

${projectDetails}

Generate a complete codebase-architecture.md file covering:

# Architecture Analysis

## Executive Summary
High-level architectural overview and key decisions.

## System Architecture
- Overall system design
- Component organization
- Service boundaries
- Data flow

## Design Patterns
- Implemented patterns (Service-Oriented, Command, Factory, etc.)
- Pattern justification
- Benefits and trade-offs
- Implementation examples

## Component Architecture
- Core services and their responsibilities
- Interface definitions and contracts
- Dependency relationships
- Communication patterns

## Data Architecture
- Data models
- Storage patterns
- Persistence strategies
- State management

## Security Architecture
- Authentication and authorization
- Data protection
- API security
- Security patterns

## Performance Architecture
- Performance considerations
- Optimization strategies
- Monitoring and metrics
- Scalability patterns

## Integration Architecture
- External integrations
- API design
- Event handling
- Message patterns

## Deployment Architecture
- Packaging strategy
- Distribution model
- Environment configuration
- Infrastructure requirements

## Architecture Evolution
- Current limitations
- Planned improvements
- Migration strategies
- Future vision

Focus on architectural decisions, patterns, and their rationale.`,

      'dev-focused': `You are a development team lead. Create a practical developer guide for this TypeScript/Node.js CLI project.

${codebaseContext}

${projectDetails}

Generate a complete codebase-dev-focused.md file covering:

# Developer Guide

## Quick Start
Get developers productive immediately:
- Setup instructions
- Essential tools
- First commands to run
- Basic workflow

## Development Environment
- IDE recommendations
- Extensions and plugins
- Debug configuration
- Environment variables

## Project Structure
- Directory organization
- File naming conventions
- Code organization patterns
- Where to find what

## Core Development Workflows
- Adding new features
- Modifying existing components
- Testing strategies
- Code review process

## Common Tasks
Step-by-step guides for:
- Adding a new CLI command
- Creating a new service
- Implementing interfaces
- Error handling

## Debugging Guide
- Common issues and solutions
- Debugging tools and techniques
- Error patterns
- Troubleshooting checklist

## Testing Guidelines
- Unit testing patterns
- Integration testing
- Test file organization
- Mocking strategies

## Code Contribution Guidelines
- Coding standards
- Git workflow
- Pull request checklist
- Documentation requirements

## Performance Tips
- Optimization techniques
- Profiling tools
- Memory management
- Best practices

## Troubleshooting
- Common problems
- Error messages
- Quick fixes
- When to ask for help

Make this practical and actionable - focus on day-to-day development needs.`,
    };

    return prompts[promptType] || prompts['copilot-instructions'];
  }

  /**
   * Build detailed project context for AI generation
   */
  private buildProjectDetails(): string {
    return `**Project Context:**
- Name: AIA CLI (AI Assistant Command Line Interface)
- Type: TypeScript Node.js CLI Application
- Architecture: Service-Oriented Architecture with Dependency Injection
- Purpose: AI-powered development tool for code analysis, optimization, and assistance
- Scale: 158 files, 85 classes, 56 functions
- Testing: 30 test files
- Main Technologies: TypeScript, Node.js, CLI frameworks, AI integrations
- Key Features: Command execution, AI queries, memory management, codebase analysis
- Development Status: Active development with advanced performance optimizations

**Available Commands:**
- agent - AI-powered task execution with reasoning
- ask - Direct AI queries
- config - Configuration management
- context - Context information display
- execute - Command execution
- index - Codebase indexing and analysis
- memory - Memory management

**Key Services:**
- AIService: AI model interactions
- MemoryService: Conversation and command memory
- ConfigurationService: System configuration
- CommandService: Command execution
- ContextService: Environment awareness
- CodeIndexService: Codebase analysis

**Architecture Characteristics:**
- Dependency injection throughout
- Interface-driven design
- Command pattern implementation
- Service-oriented composition
- Plugin extensibility
- Performance optimization focus`;
  }

  /**
   * Build context summary for AI analysis
   */
  private buildCodebaseContext(symbolData: any): string {
    let context = `**Codebase Profile:**\n`;
    context += `- Total Symbols: ${symbolData.totalSymbols || 0}\n`;
    context += `- Classes: ${symbolData.symbolCounts?.classes || 0}\n`;
    context += `- Functions: ${symbolData.symbolCounts?.functions || 0}\n`;
    context += `- Interfaces: ${symbolData.symbolCounts?.interfaces || 0}\n\n`;

    // Debug: Log actual symbol data
    console.log(chalk.cyan('🔍 DEBUG: Symbol data being passed to AI:'));
    console.log(`  Total Symbols: ${symbolData.totalSymbols || 0}`);
    console.log(
      `  Key Components: ${symbolData.keyArchitecturalComponents?.length || 0}`
    );
    console.log(
      `  Most Used Symbols: ${symbolData.mostUsedSymbols?.length || 0}`
    );

    if (symbolData.keyArchitecturalComponents?.length > 0) {
      console.log(
        `  Sample Components: ${symbolData.keyArchitecturalComponents
          .slice(0, 3)
          .join(', ')}`
      );
    }

    if (symbolData.keyArchitecturalComponents?.length > 0) {
      context += `**Key Components:**\n`;
      symbolData.keyArchitecturalComponents
        .slice(0, 8)
        .forEach((component: string) => {
          const relationship = symbolData.symbolRelationships?.[component];
          if (relationship) {
            context += `- ${component}: ${
              relationship.references
            } references in ${relationship.files?.length || 0} files\n`;
          }
        });
      context += '\n';
    }

    if (symbolData.mostUsedSymbols?.length > 0) {
      context += `**Most Referenced Symbols:**\n`;
      symbolData.mostUsedSymbols.slice(0, 5).forEach((symbol: string) => {
        const usage = symbolData.usagePatterns?.[symbol];
        if (usage) {
          context += `- ${symbol}: ${usage.totalUsages} usages across ${usage.filesUsedIn} files\n`;
        }
      });
      context += '\n';
    }

    // Add project type indicators
    const projectIndicators = this.detectProjectCharacteristics(symbolData);
    if (projectIndicators.length > 0) {
      context += `**Project Characteristics:** ${projectIndicators.join(
        ', '
      )}\n\n`;
    }

    return context;
  }

  /**
   * Detect project characteristics from symbol data
   */
  private detectProjectCharacteristics(symbolData: any): string[] {
    const characteristics = [];

    if (
      symbolData.keyArchitecturalComponents?.some((c: string) =>
        c.includes('Service')
      )
    ) {
      characteristics.push('Service-Oriented Architecture');
    }

    if (
      symbolData.keyArchitecturalComponents?.some((c: string) =>
        c.includes('Command')
      )
    ) {
      characteristics.push('Command Pattern');
    }

    if (
      symbolData.keyArchitecturalComponents?.some(
        (c: string) => c.includes('Interface') || c.startsWith('I')
      )
    ) {
      characteristics.push('Interface-Driven Design');
    }

    if (
      symbolData.keyArchitecturalComponents?.some((c: string) =>
        c.includes('Factory')
      )
    ) {
      characteristics.push('Factory Pattern');
    }

    if (
      symbolData.keyArchitecturalComponents?.some(
        (c: string) => c.includes('Container') || c.includes('DI')
      )
    ) {
      characteristics.push('Dependency Injection');
    }

    if (symbolData.symbolCounts?.classes > 50) {
      characteristics.push('Large-Scale Application');
    }

    return characteristics;
  }
}
