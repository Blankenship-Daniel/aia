const chalk = require('chalk');
const inquirer = require('inquirer');

const CodeIndexService = require('../services/CodeIndexService');
const CodebaseSummarizer = require('../CodebaseSummarizer');
const SemanticCodeAnalyzer = require('../SemanticCodeAnalyzer');

class IndexCommand {
  constructor() {
    this.name = 'index';
    this.description = 'Create and manage codebase index for AI analysis';
    this.aliases = ['idx', 'scan'];

    this.codeIndexService = new CodeIndexService();
    this.codebaseSummarizer = new CodebaseSummarizer();
    this.semanticAnalyzer = new SemanticCodeAnalyzer();
  }

  async execute(context, args, options) {
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
      console.error(chalk.red('Index command error:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async buildIndex(options) {
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
          console.log(chalk.yellow('Index build cancelled.'));
          return { success: false, error: 'Build cancelled' };
        }
      }

      const directory = options.directory || process.cwd();
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
      console.error(chalk.red('Failed to build index:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async searchIndex(query, options) {
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
      const symbolResults = this.codeIndexService.searchSymbols(searchTerm);

      // Search files
      const fileResults = this.codeIndexService.searchFiles(searchTerm);

      // Display results
      if (symbolResults.length > 0) {
        console.log(chalk.green('\n📁 Symbol Results:'));
        symbolResults.slice(0, 10).forEach((result) => {
          console.log(chalk.white(`  ${result.type}: ${result.name}`));
          console.log(chalk.gray(`    File: ${result.file}`));
          console.log(
            chalk.gray(`    Relevance: ${(result.relevance * 100).toFixed(1)}%`)
          );
        });
      }

      if (fileResults.length > 0) {
        console.log(chalk.green('\n📄 File Results:'));
        fileResults.slice(0, 10).forEach((result) => {
          console.log(chalk.white(`  ${result.path}`));
          console.log(
            chalk.gray(`    Type: ${result.type}, Language: ${result.language}`)
          );
          console.log(
            chalk.gray(`    Relevance: ${(result.relevance * 100).toFixed(1)}%`)
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
      console.error(chalk.red('Search failed:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async showStats(options) {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      const stats = this.codeIndexService.getIndexStats();

      console.log(chalk.blue.bold('\n📊 Codebase Index Statistics'));
      console.log(chalk.white(`Total Files: ${stats.totalFiles}`));
      console.log(chalk.white(`Classes: ${stats.totalClasses}`));
      console.log(chalk.white(`Functions: ${stats.totalFunctions}`));
      console.log(chalk.white(`TODO Items: ${stats.totalTodos}`));
      console.log(
        chalk.white(`Last Indexed: ${stats.lastIndexed || 'Unknown'}`)
      );

      if (options.verbose || options.detailed) {
        console.log(chalk.blue('\n🌍 Language Distribution:'));
        Object.entries(stats.languages).forEach(([lang, count]) => {
          console.log(chalk.white(`  ${lang}: ${count} files`));
        });

        if (stats.largestFiles?.length > 0) {
          console.log(chalk.blue('\n📏 Largest Files:'));
          stats.largestFiles.slice(0, 5).forEach((file) => {
            console.log(
              chalk.white(
                `  ${file.path} (${(file.size / 1024).toFixed(1)} KB)`
              )
            );
          });
        }
      }

      return {
        success: true,
        output: 'Statistics displayed',
        data: stats,
      };
    } catch (error) {
      console.error(chalk.red('Failed to show stats:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async showSummary(options) {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      console.log(chalk.blue('🤖 Generating AI-friendly summary...'));

      const summary = await this.codebaseSummarizer.generateAISummary(index);

      if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return { success: true, output: 'Summary generated', data: summary };
      }

      console.log(chalk.blue.bold('\n📋 Codebase Summary'));
      console.log(
        chalk.white(`Project Type: ${summary.summary.overview.projectType}`)
      );
      console.log(
        chalk.white(
          `Primary Language: ${summary.summary.overview.primaryLanguage}`
        )
      );
      console.log(
        chalk.white(`Architecture: ${summary.summary.overview.architecture}`)
      );
      console.log(chalk.white(`Purpose: ${summary.summary.overview.purpose}`));

      if (summary.summary.entryPoints.length > 0) {
        console.log(chalk.blue('\n🚪 Entry Points:'));
        summary.summary.entryPoints.forEach((entry) => {
          console.log(chalk.white(`  ${entry.file} (${entry.type})`));
        });
      }

      if (summary.summary.keyComponents.length > 0) {
        console.log(chalk.blue('\n🔧 Key Components:'));
        summary.summary.keyComponents.slice(0, 5).forEach((comp) => {
          console.log(chalk.white(`  ${comp.file} - ${comp.purpose}`));
        });
      }

      if (options.verbose) {
        console.log(chalk.blue('\n💡 AI Context:'));
        console.log(chalk.gray('  ' + summary.summary.aiContext.prompt));

        if (summary.summary.aiContext.keyInsights.length > 0) {
          console.log(chalk.blue('\n🎯 Key Insights:'));
          summary.summary.aiContext.keyInsights.forEach((insight) => {
            console.log(chalk.gray(`  • ${insight}`));
          });
        }
      }

      return {
        success: true,
        output: 'Summary displayed',
        data: summary,
      };
    } catch (error) {
      console.error(chalk.red('Failed to generate summary:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async listFiles(patterns, options) {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      let files = Array.from(index.files.entries());

      // Filter by patterns if provided
      if (patterns.length > 0) {
        const pattern = patterns.join(' ').toLowerCase();
        files = files.filter(
          ([path, info]) =>
            path.toLowerCase().includes(pattern) ||
            info.type.toLowerCase().includes(pattern) ||
            info.language.toLowerCase().includes(pattern)
        );
      }

      console.log(chalk.blue(`\n📄 Files (${files.length} total):`));

      // Group by type if verbose
      if (options.verbose) {
        const byType = new Map();
        files.forEach(([path, info]) => {
          if (!byType.has(info.type)) byType.set(info.type, []);
          byType.get(info.type).push(path);
        });

        for (const [type, filePaths] of byType) {
          console.log(chalk.green(`\n${type.toUpperCase()}:`));
          filePaths.slice(0, 20).forEach((path) => {
            console.log(chalk.white(`  ${path}`));
          });
          if (filePaths.length > 20) {
            console.log(chalk.gray(`  ... and ${filePaths.length - 20} more`));
          }
        }
      } else {
        files.slice(0, 50).forEach(([path, info]) => {
          console.log(chalk.white(`  ${path}`));
          if (options.detailed) {
            console.log(
              chalk.gray(
                `    ${info.language} | ${info.type} | ${info.size} bytes`
              )
            );
          }
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
      console.error(chalk.red('Failed to list files:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async listSymbols(filters, options) {
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
      let classes = Array.from(index.classes.entries());
      if (filter) {
        classes = classes.filter(([name]) =>
          name.toLowerCase().includes(filter)
        );
      }

      // Get functions
      let functions = Array.from(index.functions.entries());
      if (filter) {
        functions = functions.filter(([name]) =>
          name.toLowerCase().includes(filter)
        );
      }

      if (classes.length > 0) {
        console.log(chalk.blue(`\n🏗️  Classes (${classes.length}):`));
        classes.slice(0, 20).forEach(([name, info]) => {
          console.log(chalk.white(`  ${name}`));
          if (options.verbose) {
            console.log(chalk.gray(`    File: ${info.file}`));
            if (info.extends) {
              console.log(chalk.gray(`    Extends: ${info.extends}`));
            }
            if (info.methods && info.methods.length > 0) {
              console.log(
                chalk.gray(
                  `    Methods: ${info.methods.slice(0, 3).join(', ')}${
                    info.methods.length > 3 ? '...' : ''
                  }`
                )
              );
            }
          }
        });

        if (classes.length > 20) {
          console.log(
            chalk.gray(`  ... and ${classes.length - 20} more classes`)
          );
        }
      }

      if (functions.length > 0) {
        console.log(chalk.blue(`\n⚡ Functions (${functions.length}):`));
        functions.slice(0, 20).forEach(([name, info]) => {
          console.log(chalk.white(`  ${name}${info.async ? ' (async)' : ''}`));
          if (options.verbose) {
            console.log(chalk.gray(`    File: ${info.file}`));
          }
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
      console.error(chalk.red('Failed to list symbols:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async showTodos(filters, options) {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      const todos = this.codeIndexService.searchTodos(filters.join(' '));

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
      console.error(chalk.red('Failed to show TODOs:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async refreshIndex(options) {
    console.log(chalk.blue('🔄 Refreshing codebase index...'));

    // Force rebuild
    options.force = true;
    return await this.buildIndex(options);
  }

  async analyzeCode(options) {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      console.log(chalk.blue('🧠 Performing semantic code analysis...'));

      const analysis = await this.semanticAnalyzer.analyzeCodebaseSemantics(
        index
      );

      console.log(chalk.blue.bold('\n🏗️  Architecture Analysis'));
      if (analysis.architecture.length > 0) {
        analysis.architecture.forEach((arch) => {
          console.log(
            chalk.white(
              `  ${arch.name} (${(arch.confidence * 100).toFixed(
                1
              )}% confidence)`
            )
          );
          if (options.verbose && arch.evidence.length > 0) {
            arch.evidence.forEach((evidence) => {
              console.log(
                chalk.gray(`    ${evidence.type}: ${evidence.indicator}`)
              );
            });
          }
        });
      } else {
        console.log(chalk.gray('  No clear architectural patterns detected'));
      }

      console.log(chalk.blue.bold('\n🎨 Design Patterns'));
      if (analysis.patterns.length > 0) {
        analysis.patterns.forEach((pattern) => {
          console.log(chalk.white(`  ${pattern.name}: ${pattern.description}`));
          console.log(
            chalk.gray(
              `    Confidence: ${(pattern.confidence * 100).toFixed(1)}%`
            )
          );
          console.log(chalk.gray(`    Matches: ${pattern.matches.length}`));
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
          console.log(chalk.gray(`  • ${factor}`));
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
      console.error(chalk.red('Failed to analyze code:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async exportIndex(args, options) {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      // Determine output file
      const outputFile = args[0] || options.output || 'codebase-prompt.md';
      const format = options.format || 'markdown';
      const includeCode = options.code || false;
      const includeDetails = options.detailed || false;

      console.log(chalk.blue('📤 Exporting codebase index...'));

      let content = '';

      if (format === 'markdown') {
        content = await this.generateMarkdownPrompt(index, {
          includeCode,
          includeDetails,
        });
      } else if (format === 'json') {
        content = JSON.stringify(
          await this.generateStructuredPrompt(index, {
            includeCode,
            includeDetails,
          }),
          null,
          2
        );
      } else if (format === 'text') {
        content = await this.generateTextPrompt(index, {
          includeCode,
          includeDetails,
        });
      } else {
        return {
          success: false,
          error: 'Invalid format. Use: markdown, json, or text',
        };
      }

      // Write to file
      const fs = require('fs-extra');
      const path = require('path');
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
      console.error(chalk.red('Failed to export index:'), error.message);
      return { success: false, error: error.message };
    }
  }

  async generateMarkdownPrompt(index, options = {}) {
    const { includeCode, includeDetails } = options;
    let content = '';

    // Header
    content += '# Codebase Analysis\n\n';
    content += `*Generated on ${new Date().toISOString()}*\n\n`;

    // Project Overview
    const summaryData = await this.codebaseSummarizer.generateAISummary(index);
    const summary = summaryData.summary || summaryData; // Handle both formats
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
        const entryName =
          typeof entry === 'string' ? entry : entry.file || entry;
        content += `- **${entryName}** (main)\n`;
      }
      content += '\n';
    }

    // Key Components
    const keyComponents =
      summary.keyComponents || this.findKeyComponents(index);
    if (keyComponents && keyComponents.length > 0) {
      content += '## Key Components\n\n';
      for (const component of keyComponents.slice(0, 10)) {
        const file = component.file || component;
        const purpose = component.purpose || 'Core module';
        content += `- **${file}** - ${purpose}\n`;
        if (includeDetails && component.symbols) {
          content += `  - Symbols: ${component.symbols} items\n`;
        }
      }
      content += '\n';
    }

    // Architecture Analysis
    if (includeDetails) {
      const analysis = await this.semanticAnalyzer.analyzeCodebaseSemantics(
        index
      );

      if (analysis.architecture.length > 0) {
        content += '## Architecture Patterns\n\n';
        for (const arch of analysis.architecture) {
          content += `- **${arch.pattern}** (${(arch.confidence * 100).toFixed(
            1
          )}% confidence)\n`;
          if (arch.description) {
            content += `  - ${arch.description}\n`;
          }
        }
        content += '\n';
      }

      if (analysis.patterns.length > 0) {
        content += '## Design Patterns\n\n';
        for (const pattern of analysis.patterns) {
          content += `- **${pattern.name}** in ${pattern.file}\n`;
          if (pattern.description) {
            content += `  - ${pattern.description}\n`;
          }
        }
        content += '\n';
      }
    }

    // Classes
    if (index.classes.size > 0) {
      content += '## Classes\n\n';
      let classCount = 0;
      for (const [className, classInfo] of index.classes) {
        if (classCount >= 20 && !includeDetails) break;
        content += `### ${className}\n\n`;
        content += `- **File**: ${classInfo.file}\n`;
        if (classInfo.extends) {
          content += `- **Extends**: ${classInfo.extends}\n`;
        }
        if (classInfo.methods && classInfo.methods.length > 0) {
          content += `- **Methods**: ${classInfo.methods.join(', ')}\n`;
        }
        content += '\n';
        classCount++;
      }
      if (index.classes.size > 20 && !includeDetails) {
        content += `*... and ${index.classes.size - 20} more classes*\n\n`;
      }
    }

    // Functions
    if (index.functions.size > 0) {
      content += '## Functions\n\n';
      let funcCount = 0;
      for (const [funcName, funcInfo] of index.functions) {
        if (funcCount >= 30 && !includeDetails) break;
        content += `- **${funcName}**${funcInfo.async ? ' (async)' : ''} - ${
          funcInfo.file
        }\n`;
        funcCount++;
      }
      if (index.functions.size > 30 && !includeDetails) {
        content += `*... and ${index.functions.size - 30} more functions*\n\n`;
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
        content += `*... and ${index.todos.length - 10} more TODOs*\n`;
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
    content += '### For Custom Instructions:\n';
    content += '- Use the project overview and architecture information\n';
    content += '- Reference key components when making suggestions\n';
    content += '- Consider the primary language and frameworks\n\n';
    content += '### For Prompts:\n';
    content += '- Include relevant sections based on your specific needs\n';
    content += '- Reference specific classes/functions when asking questions\n';
    content += '- Use TODO items to understand areas needing attention\n\n';

    return content;
  }

  async generateStructuredPrompt(index, options = {}) {
    const { includeCode, includeDetails } = options;
    const summary = await this.codebaseSummarizer.generateAISummary(index);

    const structured = {
      metadata: {
        generated: new Date().toISOString(),
        totalFiles: index.files.size,
        totalClasses: index.classes.size,
        totalFunctions: index.functions.size,
        totalTodos: index.todos.length,
      },
      project: {
        type: summary.projectType,
        primaryLanguage: summary.primaryLanguage,
        architecture: summary.architecture,
        purpose: summary.purpose,
      },
      languages: this.codeIndexService.getLanguageDistribution(),
      entryPoints: summary.entryPoints || [],
      keyComponents: (summary.keyComponents || []).slice(0, 10),
      classes: Array.from(index.classes.entries())
        .slice(0, includeDetails ? -1 : 20)
        .map(([name, info]) => ({
          name,
          file: info.file,
          extends: info.extends,
          methods: info.methods || [],
        })),
      functions: Array.from(index.functions.entries())
        .slice(0, includeDetails ? -1 : 30)
        .map(([name, info]) => ({
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
      structured.analysis = {
        architecture: analysis.architecture,
        patterns: analysis.patterns,
        quality: analysis.quality,
      };
    }

    return structured;
  }

  async generateTextPrompt(index, options = {}) {
    const { includeCode, includeDetails } = options;
    let content = '';

    content += 'CODEBASE ANALYSIS\n';
    content += '=================\n\n';

    const summary = await this.codebaseSummarizer.generateAISummary(index);

    content += `Project Type: ${summary.projectType}\n`;
    content += `Primary Language: ${summary.primaryLanguage}\n`;
    content += `Architecture: ${summary.architecture}\n`;
    content += `Purpose: ${summary.purpose}\n\n`;

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

    if (summary.entryPoints && summary.entryPoints.length > 0) {
      content += 'Entry Points:\n';
      for (const entry of summary.entryPoints) {
        content += `- ${entry}\n`;
      }
      content += '\n';
    }

    if (index.classes.size > 0) {
      content += 'Key Classes:\n';
      let count = 0;
      for (const [name, info] of index.classes) {
        if (count >= 10 && !includeDetails) break;
        content += `- ${name} (${info.file})\n`;
        count++;
      }
      content += '\n';
    }

    return content;
  }

  async generatePrompts(args, options) {
    try {
      const index = await this.codeIndexService.loadIndex();
      if (!index) {
        console.log(
          chalk.yellow('No index found. Build one first with: aia index build')
        );
        return { success: false, output: 'No index found' };
      }

      // Load configuration to get output directories
      const ConfigurationManager = require('../ConfigurationManager');
      const path = require('path');
      const fs = require('fs-extra');

      // Check for local project config first, then fall back to global config
      let configManager;
      const localConfigDir = path.join(process.cwd(), '.aia');
      const localConfigFile = path.join(localConfigDir, 'config.json');

      if (await fs.pathExists(localConfigFile)) {
        configManager = new ConfigurationManager(localConfigDir);
      } else {
        configManager = new ConfigurationManager();
      }

      await configManager.initialize();
      const config = await configManager.getConfig();

      const type = options.type || 'all';
      const explicitOutputDir = options.output; // Keep track of whether user provided explicit output

      // Helper function to get the output directory for a file type
      const getOutputDir = (fileType) => {
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
            case 'custom-instructions':
              configuredDir =
                config.outputDirectories.customInstructions || '.';
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

        return '.'; // Default fallback
      };

      console.log(chalk.blue('📝 Generating AI prompt files...'));

      let results = [];

      if (type === 'all') {
        // Generate all types with their configured directories
        const types = [
          {
            type: 'comprehensive',
            dir: getOutputDir('comprehensive'),
          },
          {
            type: 'minimal',
            dir: getOutputDir('minimal'),
          },
          {
            type: 'architecture',
            dir: getOutputDir('architecture'),
          },
          {
            type: 'dev-focused',
            dir: getOutputDir('dev-focused'),
          },
          {
            type: 'copilot-instructions',
            dir: getOutputDir('copilot-instructions'),
          },
        ];

        for (const { type: promptType, dir } of types) {
          if (promptType === 'copilot-instructions') {
            const file = await this.codeIndexService.saveCustomInstructions(
              'copilot-instructions.md',
              dir
            );
            const fileJSON = await this.codeIndexService.savePromptFile(
              await this.codeIndexService.generateCustomInstructions('json'),
              'copilot-instructions.json',
              dir
            );
            results.push(file, fileJSON);
          } else {
            const content = await this.codeIndexService.generatePromptFile(
              promptType,
              options.code
            );
            const filename = `codebase-${promptType}.md`;
            const file = await this.codeIndexService.savePromptFile(
              content,
              filename,
              dir
            );
            results.push(file);
          }
        }

        console.log(
          chalk.green(`✅ Generated ${results.length} prompt files:`)
        );
        results.forEach((file) => {
          console.log(chalk.gray(`   ${file}`));
        });
      } else if (type === 'custom-instructions') {
        const typeOutputDir = getOutputDir('custom-instructions');
        const file = await this.codeIndexService.saveCustomInstructions(
          'copilot-instructions.md',
          typeOutputDir
        );
        const fileJSON = await this.codeIndexService.savePromptFile(
          await this.codeIndexService.generateCustomInstructions('json'),
          'custom-instructions.json',
          typeOutputDir
        );

        results = [file, fileJSON];
        console.log(chalk.green('✅ Generated custom instructions:'));
        console.log(chalk.gray(`   ${file}`));
        console.log(chalk.gray(`   ${fileJSON}`));
      } else {
        // Generate specific type
        const typeOutputDir = getOutputDir(type);
        const content = await this.codeIndexService.generatePromptFile(
          type,
          options.code
        );
        const filename = `codebase-${type}.md`;
        const file = await this.codeIndexService.savePromptFile(
          content,
          filename,
          typeOutputDir
        );

        results = [file];
        console.log(chalk.green(`✅ Generated ${type} prompt:`));
        console.log(chalk.gray(`   ${file}`));
      }

      const totalSize = results.reduce((sum, file) => {
        try {
          const fs = require('fs');
          return sum + fs.statSync(file).size;
        } catch (error) {
          return sum;
        }
      }, 0);

      console.log(
        chalk.gray(`   Total size: ${(totalSize / 1024).toFixed(1)} KB`)
      );

      return {
        success: true,
        output: `Generated ${results.length} prompt files`,
        data: { files: results, totalSize },
      };
    } catch (error) {
      console.error(chalk.red('Failed to generate prompts:'), error.message);
      return { success: false, error: error.message };
    }
  }

  getName() {
    return this.name;
  }

  getDescription() {
    return this.description;
  }

  getAliases() {
    return this.aliases;
  }

  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      usage: 'index <action> [options]',
      aliases: this.aliases,
      examples: [
        'aia index build',
        'aia index search "UserService"',
        'aia index stats --verbose',
        'aia index summary --json',
        'aia index files test',
        'aia index symbols --verbose',
        'aia index todos',
        'aia index analyze',
        'aia index export',
        'aia index export codebase-context.md --format markdown --detailed',
        'aia index export prompt.json --format json',
      ],
      options: [
        {
          name: 'force',
          description: 'Force rebuild even if index exists',
          type: 'boolean',
          required: false,
        },
        {
          name: 'directory',
          description: 'Directory to index (default: current)',
          type: 'string',
          required: false,
        },
        {
          name: 'verbose',
          description: 'Show detailed output',
          type: 'boolean',
          required: false,
        },
        {
          name: 'json',
          description: 'Output results as JSON',
          type: 'boolean',
          required: false,
        },
        {
          name: 'detailed',
          description: 'Show detailed information',
          type: 'boolean',
          required: false,
        },
        {
          name: 'output',
          description: 'Output file path for export',
          type: 'string',
          required: false,
        },
        {
          name: 'format',
          description: 'Export format: markdown, json, or text',
          type: 'string',
          required: false,
        },
        {
          name: 'code',
          description: 'Include code snippets in export',
          type: 'boolean',
          required: false,
        },
      ],
    };
  }

  getHelp() {
    return `
${chalk.bold(
  'Index Command'
)} - Create and manage codebase index for AI analysis

${chalk.blue('USAGE:')}
  aia index <action> [options]

${chalk.blue('ACTIONS:')}
  build      Build/create the codebase index
  search     Search the index for symbols or files  
  stats      Show index statistics
  summary    Show AI-friendly codebase summary
  files      List files by pattern
  symbols    List symbols (classes, functions)
  todos      Show TODO items
  refresh    Rebuild the entire index
  analyze    Perform semantic code analysis
  export     Export index to file for AI prompts
  prompts    Generate specialized AI prompt files

${chalk.blue('OPTIONS:')}
  --force       Force rebuild even if index exists
  --directory   Directory to index (default: current)
  --verbose     Show detailed output
  --json        Output results as JSON
  --detailed    Show detailed information
  --type        Type of prompt to generate (all, custom-instructions, comprehensive, minimal, architecture, dev-focused)
  --output      Output directory for generated files
  --code        Include code snippets in prompts

${chalk.blue('EXAMPLES:')}
  aia index build
  aia index search "UserService"
  aia index stats --verbose
  aia index summary --json
  aia index files test
  aia index symbols --verbose
  aia index todos
  aia index analyze
  aia index export codebase.md --format markdown --detailed
  aia index prompts --type all --output ./prompts
  aia index prompts --type custom-instructions
    `;
  }
}

module.exports = { IndexCommand };
