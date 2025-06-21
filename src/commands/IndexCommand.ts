// Use require for chalk to match existing codebase patterns
const chalk = require('chalk');
import * as fs from 'fs-extra';
import * as path from 'path';

// Use require for inquirer to avoid module import issues
const inquirer = require('inquirer');

import { ICommand, CommandDefinition } from '../interfaces/ICommand.js';
import { CommandResult, CommandOptions, AsyncResult } from '../types/index.js';

// Import TypeScript modules
import { CodeIndexService } from '../services/CodeIndexService.js';
import { SymbolIndexService } from '../services/SymbolIndexService.js';
import CodebaseSummarizer from '../CodebaseSummarizer.js';
import SemanticCodeAnalyzer from '../SemanticCodeAnalyzer.js';
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

export class IndexCommand implements ICommand {
  private name = 'index';
  private description = 'Create and manage codebase index for AI analysis';
  private aliases = ['idx', 'scan'];

  private codeIndexService: CodeIndexService;
  private symbolIndexService: SymbolIndexService;
  private codebaseSummarizer: CodebaseSummarizer;
  private semanticAnalyzer: SemanticCodeAnalyzer;

  constructor() {
    this.codeIndexService = new CodeIndexService();

    // TODO: This should be injected via DI container
    // For now, create a simple mock cache service
    const mockCache = {
      async get<T>(key: string): Promise<T | null> {
        return null;
      },
      async set<T>(key: string, value: T, options?: any): Promise<void> {},
      async has(key: string): Promise<boolean> {
        return false;
      },
      async delete(key: string): Promise<boolean> {
        return false;
      },
      async deletePattern(pattern: string): Promise<number> {
        return 0;
      },
      async clear(): Promise<void> {},
      async getStatistics(): Promise<any> {
        return {
          totalKeys: 0,
          hitRate: 0,
          missRate: 0,
          totalHits: 0,
          totalMisses: 0,
          totalRequests: 0,
          averageAccessTime: 0,
          memoryUsage: 0,
          oldestEntry: 0,
          newestEntry: 0,
        };
      },
      async keys(): Promise<string[]> {
        return [];
      },
      async size(): Promise<number> {
        return 0;
      },
      async refresh(key: string, ttl?: number): Promise<boolean> {
        return false;
      },
      async mget<T>(keys: string[]): Promise<(T | null)[]> {
        return keys.map(() => null);
      },
      async mset<T>(
        entries: Array<{ key: string; value: T; options?: any }>
      ): Promise<void> {},
      async warm<T>(
        key: string,
        loader: () => Promise<T>,
        options?: any
      ): Promise<T> {
        return await loader();
      },
      startCleanup(intervalMs?: number): void {},
      stopCleanup(): void {},
      async cleanup(): Promise<number> {
        return 0;
      },
    };

    this.symbolIndexService = new SymbolIndexService(mockCache);
    this.codebaseSummarizer = new CodebaseSummarizer();
    this.semanticAnalyzer = new SemanticCodeAnalyzer();
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

  private async refreshIndex(options: CommandOptions): Promise<CommandResult> {
    console.log(chalk.blue('🔄 Refreshing codebase index...'));

    // Force rebuild
    const refreshOptions = { ...options, force: true };
    return await this.buildIndex(refreshOptions);
  }

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
        architecture: semanticAnalysis.architecture.map((pattern) => ({
          name: pattern.name,
          confidence: pattern.confidence,
          evidence: pattern.evidence.map((e) => e.indicator),
        })),
        patterns: semanticAnalysis.patterns.map((pattern) => ({
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
            (issue) => `${issue.severity.toUpperCase()}: ${issue.type} issue`
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

      console.log(chalk.blue('📝 Generating AI prompt files...'));

      const results: ExportResult[] = [];

      if (type === 'all') {
        const types = [
          'copilot-instructions',
          'comprehensive',
          'minimal',
          'architecture',
          'dev-focused',
        ];
        for (const promptType of types) {
          const content = await this.codeIndexService.generatePromptFile(
            promptType,
            Boolean(options.code)
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
        const content = await this.codeIndexService.generatePromptFile(
          type,
          Boolean(options.code)
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

  getName(): string {
    return this.name;
  }

  getAliases(): string[] {
    return this.aliases;
  }

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
}
