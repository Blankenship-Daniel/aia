/**
 * SuggestPromptsCommand.ts - GenAI-powered prompt suggestion command.
 *
 * Responsibilities:
 * - Analyzes codebase structure and patterns using existing index services
 * - Generates contextually relevant, reusable prompts using GenAI
 * - Provides categorized prompts for different development scenarios
 * - Supports multiple output formats and deep analysis features
 * - Integrates with memory service for prompt usage tracking
 *
 * Architecture:
 * - Implements ICommand interface following AIA's command patterns
 * - Uses dependency injection for AI, code index, and context services
 * - Leverages existing codebase analysis for context-aware prompt generation
 * - Provides configurable output formats and analysis depth
 *
 * @see IAIService - Service for GenAI prompt generation
 * @see ICodeIndexService - Service for codebase analysis and indexing
 * @see IContextService - Service for environment and project context
 * @see IMemoryService - Service for storing and tracking prompt usage
 */

import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IAIService } from '../interfaces/IAIService';
import { ICodeIndexService } from '../interfaces/ICodeIndexService';
import { IContextService } from '../interfaces/IContextService';
import { IMemoryService } from '../interfaces/IMemoryService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import {
  CommandResult,
  CommandOptions,
  GeneratedPrompts,
  GeneratedPrompt,
  CodebaseAnalysis,
  PromptCategory,
  PromptGenerationOptions,
  ContextInfo,
} from '../types/index';

// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });

import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * SuggestPromptsCommand class
 *
 * Generates contextually relevant AI prompts based on codebase analysis
 */
export class SuggestPromptsCommand implements ICommand {
  public readonly name = 'suggest-prompts';
  public readonly description =
    'Generate reusable AI prompts tailored to your codebase using GenAI analysis';
  public readonly aliases = ['sp', 'prompts'];

  constructor(
    private aiService: IAIService,
    private codeIndexService: ICodeIndexService,
    private contextService: IContextService,
    private memoryService: IMemoryService,
    private configurationService: IConfigurationService
  ) {}

  public getDefinition(): CommandDefinition {
    return {
      name: this.name,
      description: this.description,
      usage: 'aia suggest-prompts [options]',
      examples: [
        'aia suggest-prompts',
        'aia sp --category debugging --count 10',
        'aia prompts --analyze-deep --output team-prompts.md',
        'aia suggest-prompts --format json --output prompts.json',
      ],
      aliases: this.aliases,
      options: [
        {
          name: 'category',
          description:
            'Filter by category (refactoring, debugging, testing, documentation, security, performance, architecture, code-review)',
          type: 'string',
          required: false,
        },
        {
          name: 'count',
          description: 'Number of prompts per category (default: 5)',
          type: 'number',
          required: false,
          default: 5,
        },
        {
          name: 'output',
          description: 'Save prompts to file',
          type: 'string',
          required: false,
        },
        {
          name: 'analyze-deep',
          description: 'Perform deep codebase analysis including git history',
          type: 'boolean',
          required: false,
          default: false,
        },
        {
          name: 'include-examples',
          description: 'Include usage examples in generated prompts',
          type: 'boolean',
          required: false,
          default: false,
        },
        {
          name: 'format',
          description: 'Output format (markdown, json, yaml)',
          type: 'string',
          required: false,
          default: 'markdown',
        },
        {
          name: 'no-cache',
          description: 'Skip cache and force regeneration',
          type: 'boolean',
          required: false,
          default: false,
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
    // Basic validation - this command doesn't require specific arguments
    return { valid: true, errors: [] };
  }

  public getHelp(): string {
    const definition = this.getDefinition();
    let help = `${chalk.blue(definition.name)} - ${definition.description}\n\n`;

    if (definition.usage) {
      help += `${chalk.yellow('Usage:')}\n  ${definition.usage}\n\n`;
    }

    if (definition.examples?.length) {
      help += `${chalk.yellow('Examples:')}\n`;
      definition.examples.forEach((example) => {
        help += `  ${chalk.gray(example)}\n`;
      });
      help += '\n';
    }

    if (definition.options?.length) {
      help += `${chalk.yellow('Options:')}\n`;
      definition.options.forEach((option) => {
        const defaultText =
          option.default !== undefined ? ` (default: ${option.default})` : '';
        help += `  --${option.name}  ${option.description}${defaultText}\n`;
      });
    }

    return help;
  }

  /**
   * Generates a default output path based on the configured directory and format
   */
  private generateDefaultOutputPath(directory: string, format: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const extension =
      format === 'json' ? 'json' : format === 'yaml' ? 'yaml' : 'md';
    return path.join(directory, `suggested-prompts-${timestamp}.${extension}`);
  }

  /**
   * Executes the suggest-prompts command
   */
  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      // Get the configured suggest prompts directory
      const configuredDirectory =
        this.configurationService.getSetting('suggestPromptsDirectory') ||
        './suggested-prompts';

      const generationOptions: PromptGenerationOptions = {
        category: options.category as PromptCategory,
        count: (options.count as number) || 5,
        includeExamples: (options['include-examples'] as boolean) || false,
        analyzeDeep: (options['analyze-deep'] as boolean) || false,
        outputFormat:
          (options.format as 'markdown' | 'json' | 'yaml') || 'markdown',
        outputPath:
          (options.output as string) ||
          this.generateDefaultOutputPath(
            configuredDirectory,
            (options.format as string) || 'markdown'
          ),
        useCache: !(options['no-cache'] as boolean),
      };

      console.log(
        chalk.blue('🤖 Analyzing codebase for AI prompt generation...')
      );

      const spinner = ora('Loading codebase analysis...').start();

      try {
        // Step 1: Gather comprehensive context
        const projectContext = await this.contextService.gatherContext();
        spinner.text = 'Analyzing codebase structure...';

        // Step 2: Load existing codebase index
        const codebaseIndex = await this.codeIndexService.indexCodebase(
          projectContext.workingDirectory
        );
        spinner.text = 'Performing deep analysis...';

        // Step 3: Perform enhanced codebase analysis
        const codebaseAnalysis = await this.analyzeCodebase(
          projectContext,
          codebaseIndex,
          generationOptions.analyzeDeep || false
        );
        spinner.text = 'Generating AI prompts...';

        // Step 4: Generate prompts using GenAI
        const generatedPrompts = await this.generatePromptsWithAI(
          codebaseAnalysis,
          generationOptions
        );

        spinner.succeed(`Generated ${generatedPrompts.prompts.length} prompts`);

        // Step 5: Store in memory for future reference
        await this.storePromptsInMemory(generatedPrompts);

        // Step 6: Display results
        this.displayPrompts(generatedPrompts, generationOptions);

        // Step 7: Save to file if requested
        if (generationOptions.outputPath) {
          await this.savePromptsToFile(generatedPrompts, generationOptions);
        }

        return {
          success: true,
          data: generatedPrompts,
          output: `Successfully generated ${generatedPrompts.prompts.length} prompts`,
        };
      } catch (error) {
        spinner.fail('Failed to generate prompts');
        throw error;
      }
    } catch (error) {
      console.error(chalk.red('❌ Error generating prompts:'), error);
      return {
        success: false,
        error: `Failed to generate prompts: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        data: null,
      };
    }
  }

  /**
   * Analyzes the codebase to gather context for prompt generation
   */
  private async analyzeCodebase(
    projectContext: ContextInfo,
    codebaseIndex: any,
    deepAnalysis: boolean
  ): Promise<CodebaseAnalysis> {
    const analysis: CodebaseAnalysis = {
      projectType: projectContext.projectType || 'unknown',
      primaryLanguage: this.detectPrimaryLanguage(codebaseIndex),
      architecture: this.detectArchitecture(codebaseIndex),
      technologies: this.extractTechnologies(codebaseIndex),
      fileCount: codebaseIndex?.stats?.totalFiles || 0,
      keyComponents: this.extractKeyComponents(codebaseIndex),
      patterns: this.detectPatterns(codebaseIndex),
      frameworks: this.detectFrameworks(codebaseIndex),
      testingFrameworks: this.detectTestingFrameworks(codebaseIndex),
      buildTools: this.detectBuildTools(codebaseIndex),
    };

    // Enhanced analysis with semantic and structural insights
    if (codebaseIndex) {
      // Add semantic analysis
      analysis.semanticPatterns = this.detectSemanticPatterns(codebaseIndex);
      analysis.namingConventions = this.analyzeNamingConventions(codebaseIndex);
      analysis.codeQualityIndicators = this.analyzeCodeQuality(codebaseIndex);
      analysis.projectMaturity = this.assessProjectMaturity(codebaseIndex);
      analysis.domainContext = this.extractDomainContext(codebaseIndex);
    }

    // Perform deep analysis if requested
    if (deepAnalysis) {
      analysis.gitHistory = await this.analyzeGitHistory(
        projectContext.workingDirectory
      );
    }

    return analysis;
  }

  /**
   * Generates prompts using GenAI based on codebase analysis
   */
  private async generatePromptsWithAI(
    codebaseAnalysis: CodebaseAnalysis,
    options: PromptGenerationOptions
  ): Promise<GeneratedPrompts> {
    const categories = options.category
      ? [options.category]
      : ([
          'refactoring',
          'debugging',
          'testing',
          'documentation',
          'security',
          'performance',
          'architecture',
          'code-review',
        ] as PromptCategory[]);

    const count = options.count || 5;
    const includeExamples = options.includeExamples || false;

    const systemPrompt = this.buildSystemPrompt(codebaseAnalysis, options);

    try {
      const response = await this.aiService.queryAI(
        systemPrompt,
        {} as ContextInfo
      );

      const parsedPrompts = this.parseAIResponse(response.content, categories);

      return {
        prompts: parsedPrompts,
        metadata: {
          totalGenerated: parsedPrompts.length,
          categories,
          codebaseAnalysis,
          generatedAt: new Date(),
          aiModel: response.model,
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate prompts with AI: ${error}`);
    }
  }

  /**
   * Builds the system prompt for AI prompt generation
   */
  private buildSystemPrompt(
    codebaseAnalysis: CodebaseAnalysis,
    options: PromptGenerationOptions
  ): string {
    const { category, count, includeExamples } = options;

    // Build enhanced context sections
    const baseContext = this.buildBaseContextSection(codebaseAnalysis);
    const semanticContext = this.buildSemanticContextSection(codebaseAnalysis);
    const qualityContext = this.buildQualityContextSection(codebaseAnalysis);
    const domainContext = this.buildDomainContextSection(codebaseAnalysis);
    const maturityContext = this.buildMaturityContextSection(codebaseAnalysis);

    return `You are an expert software engineer and AI prompt specialist analyzing a ${
      codebaseAnalysis.projectType
    } codebase. Your task is to generate highly contextual, actionable prompts that developers can use with AI assistants.

${baseContext}

${semanticContext}

${qualityContext}

${domainContext}

${maturityContext}

TASK: Generate ${count} highly specific, reusable prompts that developers can use with AI assistants when working on this codebase.

${
  category
    ? `Focus EXCLUSIVELY on ${category} prompts.`
    : 'Generate prompts across all categories, weighted based on the codebase analysis.'
}

PROMPT CATEGORIES (with contextual priorities):
1. Refactoring - Improve code quality, patterns, and structure
2. Debugging - Troubleshoot issues and analyze problems  
3. Testing - Write tests, improve coverage, test strategies
4. Documentation - Generate docs, comments, and explanations
5. Security - Identify vulnerabilities and improve security
6. Performance - Optimize code and identify bottlenecks
7. Architecture - Design patterns and structural improvements
8. Code Review - Review guidelines and quality checks

PROMPT STRUCTURE:
Each prompt must include:
- id: unique identifier (format: category-action-timestamp)
- title: descriptive title that mentions specific technologies/patterns from this codebase
- category: one of the categories above
- prompt: the actual prompt text (HIGHLY specific to this codebase)
- description: brief explanation of what the prompt accomplishes
- tags: relevant keywords/tags from the analysis above
- difficulty: beginner/intermediate/advanced (based on codebase complexity)
- codebaseSpecific: true (since these are tailored)
${
  includeExamples
    ? '- example: practical usage example with actual component names'
    : ''
}

CRITICAL REQUIREMENTS:
1. Reference actual technologies, frameworks, and patterns found in the analysis
2. Include specific component types, naming conventions, and architectural patterns
3. Address quality issues and improvement opportunities identified
4. Leverage the project's maturity level for appropriate suggestions
5. Use business and technical domain context to make prompts relevant
6. Reference actual file structures, naming conventions, and detected patterns
7. Consider the project's development practices and suggest improvements

PROMPT QUALITY GUIDELINES:
- Each prompt should solve a real problem developers face with this specific codebase
- Include references to actual architectural patterns detected (${
      codebaseAnalysis.patterns?.join(', ') || 'none detected'
    })
- Consider the naming conventions found: ${this.formatNamingConventions(
      codebaseAnalysis.namingConventions
    )}
- Address quality issues: ${
      codebaseAnalysis.codeQualityIndicators?.issues?.join(', ') ||
      'none identified'
    }
- Align with project maturity level: ${
      codebaseAnalysis.projectMaturity?.level || 'unknown'
    }

RESPONSE FORMAT:
Your response must be ONLY a valid JSON array with no additional text, explanations, or formatting. The response should start with [ and end with ]. Do not wrap it in code blocks or add any other content.

Generate prompts as a JSON array with the structure above.`;
  }

  /**
   * Helper methods for building context sections
   */
  private buildBaseContextSection(analysis: CodebaseAnalysis): string {
    return `CODEBASE ANALYSIS:
- Project Type: ${analysis.projectType}
- Primary Language: ${analysis.primaryLanguage}
- Architecture: ${analysis.architecture}
- Key Technologies: ${analysis.technologies.join(', ')}
- Total Files: ${analysis.fileCount}
- Key Components: ${analysis.keyComponents.join(', ')}
- Frameworks: ${analysis.frameworks.join(', ')}
- Testing Frameworks: ${analysis.testingFrameworks.join(', ')}
- Build Tools: ${analysis.buildTools.join(', ')}
- Detected Patterns: ${analysis.patterns.join(', ')}`;
  }

  private buildSemanticContextSection(analysis: CodebaseAnalysis): string {
    if (!analysis.semanticPatterns?.length) return '';

    return `
SEMANTIC PATTERNS DETECTED:
- Advanced Patterns: ${analysis.semanticPatterns.join(', ')}
- This suggests the codebase uses sophisticated architectural approaches`;
  }

  private buildQualityContextSection(analysis: CodebaseAnalysis): string {
    if (!analysis.codeQualityIndicators) return '';

    const quality = analysis.codeQualityIndicators;
    return `
CODE QUALITY ANALYSIS:
- Complexity Level: ${quality.complexity}
- Test Coverage: ${quality.testCoverage}
- Documentation Quality: ${quality.documentation}
- Maintainability Score: ${quality.maintainabilityScore}/1.0
- Quality Issues: ${quality.issues.join(', ') || 'none identified'}`;
  }

  private buildDomainContextSection(analysis: CodebaseAnalysis): string {
    if (!analysis.domainContext) return '';

    const domain = analysis.domainContext;
    return `
DOMAIN CONTEXT:
- Business Domain: ${domain.businessDomain.join(', ') || 'none detected'}
- Technical Domain: ${domain.technicalDomain.join(', ')}
- Integration Patterns: ${
      domain.integrationPatterns.join(', ') || 'none detected'
    }
- API Styles: ${domain.apiStyles.join(', ') || 'none detected'}`;
  }

  private buildMaturityContextSection(analysis: CodebaseAnalysis): string {
    if (!analysis.projectMaturity) return '';

    const maturity = analysis.projectMaturity;
    return `
PROJECT MATURITY:
- Maturity Level: ${maturity.level}
- Present Indicators: ${maturity.indicators.join(', ')}
- Suggested Improvements: ${maturity.suggestedImprovements.join(', ')}`;
  }

  private formatNamingConventions(conventions?: any): string {
    if (!conventions) return 'none detected';

    const parts = [];
    if (conventions.classPatterns?.length)
      parts.push(`Classes: ${conventions.classPatterns.join(', ')}`);
    if (conventions.functionPatterns?.length)
      parts.push(`Functions: ${conventions.functionPatterns.join(', ')}`);
    if (conventions.filePatterns?.length)
      parts.push(`Files: ${conventions.filePatterns.join(', ')}`);

    return parts.join('; ') || 'none detected';
  }

  /**
   * Parses AI response and converts to GeneratedPrompt objects
   */
  private parseAIResponse(
    response: string,
    categories: PromptCategory[]
  ): GeneratedPrompt[] {
    try {
      // Clean up the response - remove any leading/trailing whitespace and explanatory text
      let cleanResponse = response.trim();

      // First, try to find JSON in code blocks
      const codeBlockMatch = cleanResponse.match(
        /```(?:json)?\s*(\[[\s\S]*?\])\s*```/
      );
      if (codeBlockMatch) {
        const parsed = JSON.parse(codeBlockMatch[1]);
        return this.mapAIResponseToPrompts(parsed);
      }

      // Try to extract JSON array from the response - look for the first [ and last ]
      const firstBracket = cleanResponse.indexOf('[');
      const lastBracket = cleanResponse.lastIndexOf(']');

      if (
        firstBracket !== -1 &&
        lastBracket !== -1 &&
        firstBracket < lastBracket
      ) {
        const jsonString = cleanResponse.substring(
          firstBracket,
          lastBracket + 1
        );
        const parsed = JSON.parse(jsonString);
        return this.mapAIResponseToPrompts(parsed);
      }

      // Try the simple regex match as fallback
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.mapAIResponseToPrompts(parsed);
      }

      throw new Error('No JSON array found in AI response');
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Failed to parse AI response (${
            error instanceof Error ? error.message : 'Unknown error'
          }), generating fallback prompts`
        )
      );
      console.log(
        chalk.gray('AI Response preview:'),
        response.substring(0, 200) + '...'
      );
      return this.generateFallbackPrompts(categories);
    }
  }

  /**
   * Maps parsed AI response to GeneratedPrompt objects
   */
  private mapAIResponseToPrompts(parsed: any[]): GeneratedPrompt[] {
    return parsed.map((item: any, index: number) => ({
      id: item.id || `prompt-${Date.now()}-${index}`,
      title: item.title || 'Untitled Prompt',
      category: (item.category as PromptCategory) || 'refactoring',
      prompt: item.prompt || '',
      description: item.description || '',
      example: item.example,
      tags: Array.isArray(item.tags) ? item.tags : [],
      difficulty: item.difficulty || 'intermediate',
      codebaseSpecific: item.codebaseSpecific !== false,
      usageCount: 0,
      lastUsed: undefined,
    }));
  }

  /**
   * Generates fallback prompts if AI parsing fails
   */
  private generateFallbackPrompts(
    categories: PromptCategory[]
  ): GeneratedPrompt[] {
    const fallbackPrompts: GeneratedPrompt[] = [
      {
        id: 'fallback-refactor-1',
        title: 'Refactor Code Structure',
        category: 'refactoring',
        prompt:
          'Analyze this code and suggest refactoring improvements to enhance readability, maintainability, and follow best practices.',
        description: 'General code refactoring guidance',
        tags: ['refactoring', 'code-quality', 'best-practices'],
        difficulty: 'intermediate',
        codebaseSpecific: false,
        usageCount: 0,
      },
      {
        id: 'fallback-debug-1',
        title: 'Debug Issue Analysis',
        category: 'debugging',
        prompt:
          'Help me debug this issue by analyzing the code, identifying potential problems, and suggesting debugging strategies.',
        description: 'General debugging assistance',
        tags: ['debugging', 'troubleshooting', 'analysis'],
        difficulty: 'intermediate',
        codebaseSpecific: false,
        usageCount: 0,
      },
    ];

    return fallbackPrompts.filter((p) => categories.includes(p.category));
  }

  /**
   * Helper methods for codebase analysis
   */
  private detectPrimaryLanguage(codebaseIndex: any): string {
    if (!codebaseIndex?.files) return 'unknown';

    const extensions: Record<string, number> = {};

    // Handle both Map and Array formats
    const filesData =
      codebaseIndex.files instanceof Map
        ? Array.from(codebaseIndex.files.values())
        : codebaseIndex.files;

    filesData.forEach((file: any) => {
      const ext = path.extname(file.path).toLowerCase();
      extensions[ext] = (extensions[ext] || 0) + 1;
    });

    const sortedExtensions = Object.entries(extensions).sort(
      ([, a], [, b]) => b - a
    );

    const extToLanguage: Record<string, string> = {
      '.ts': 'TypeScript',
      '.js': 'JavaScript',
      '.py': 'Python',
      '.java': 'Java',
      '.go': 'Go',
      '.rs': 'Rust',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.php': 'PHP',
      '.rb': 'Ruby',
    };

    return extToLanguage[sortedExtensions[0]?.[0]] || 'Mixed';
  }

  private detectArchitecture(codebaseIndex: any): string {
    if (!codebaseIndex?.files) return 'unknown';

    // Handle both Map and Array formats
    const filesData =
      codebaseIndex.files instanceof Map
        ? Array.from(codebaseIndex.files.values())
        : codebaseIndex.files;

    const files = filesData.map((f: any) => f.path.toLowerCase());

    if (
      files.some(
        (f: string) => f.includes('microservice') || f.includes('service')
      )
    ) {
      return 'Microservices';
    }
    if (
      files.some((f: string) => f.includes('controller') && f.includes('model'))
    ) {
      return 'MVC';
    }
    if (
      files.some((f: string) => f.includes('component') || f.includes('react'))
    ) {
      return 'Component-based';
    }
    if (files.some((f: string) => f.includes('layer') || f.includes('tier'))) {
      return 'Layered';
    }

    return 'Modular';
  }

  private extractTechnologies(codebaseIndex: any): string[] {
    const technologies: string[] = [];

    if (!codebaseIndex?.files) return technologies;

    // Handle both Map and Array formats
    const filesData =
      codebaseIndex.files instanceof Map
        ? Array.from(codebaseIndex.files.values())
        : codebaseIndex.files;

    const files = filesData.map((f: any) => f.path.toLowerCase());
    const content = filesData
      .map((f: any) => f.content || '')
      .join(' ')
      .toLowerCase();

    // Common technologies to detect
    const techPatterns = {
      React: /react|jsx/,
      'Vue.js': /vue|vuex/,
      Angular: /angular|@angular/,
      'Node.js': /node|npm|package\.json/,
      Express: /express/,
      TypeScript: /typescript|\.ts$/,
      Jest: /jest|\.test\.|\.spec\./,
      Docker: /docker|dockerfile/,
      Kubernetes: /kubernetes|k8s/,
      GraphQL: /graphql|gql/,
      MongoDB: /mongodb|mongoose/,
      PostgreSQL: /postgres|pg|psql/,
      Redis: /redis/,
      AWS: /aws|amazon/,
      Webpack: /webpack/,
      Vite: /vite/,
      ESLint: /eslint/,
      Prettier: /prettier/,
    };

    Object.entries(techPatterns).forEach(([tech, pattern]) => {
      if (pattern.test(content) || files.some((f: string) => pattern.test(f))) {
        technologies.push(tech);
      }
    });

    return technologies;
  }

  private extractKeyComponents(codebaseIndex: any): string[] {
    if (!codebaseIndex?.symbols) return [];

    const components: string[] = [];

    // Extract class names and important functions
    codebaseIndex.symbols?.forEach((symbol: any) => {
      if (symbol.kind === 'class' || symbol.kind === 'interface') {
        components.push(symbol.name);
      }
    });

    return components.slice(0, 10); // Limit to top 10
  }

  private detectPatterns(codebaseIndex: any): string[] {
    const patterns: string[] = [];

    if (!codebaseIndex?.files) return patterns;

    // Handle both Map and Array formats
    const filesData =
      codebaseIndex.files instanceof Map
        ? Array.from(codebaseIndex.files.values())
        : codebaseIndex.files;

    const content = filesData
      .map((f: any) => f.content || '')
      .join(' ')
      .toLowerCase();

    // Common design patterns to detect
    const patternChecks = {
      'Dependency Injection': /inject|injectable|container|ioc/,
      'Factory Pattern': /factory|create[a-z]/,
      'Observer Pattern': /observer|subscribe|emit|event/,
      'Command Pattern': /command|execute|invoke/,
      'Strategy Pattern': /strategy|algorithm/,
      'Repository Pattern': /repository|repo/,
      'Service Layer': /service|business.*logic/,
      MVC: /controller|model|view/,
      Middleware: /middleware|pipeline/,
    };

    Object.entries(patternChecks).forEach(([pattern, regex]) => {
      if (regex.test(content)) {
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  private detectFrameworks(codebaseIndex: any): string[] {
    return this.extractTechnologies(codebaseIndex).filter((tech) =>
      ['React', 'Vue.js', 'Angular', 'Express', 'Next.js', 'Nuxt.js'].includes(
        tech
      )
    );
  }

  private detectTestingFrameworks(codebaseIndex: any): string[] {
    return this.extractTechnologies(codebaseIndex).filter((tech) =>
      ['Jest', 'Mocha', 'Jasmine', 'Cypress', 'Playwright'].includes(tech)
    );
  }

  private detectBuildTools(codebaseIndex: any): string[] {
    return this.extractTechnologies(codebaseIndex).filter((tech) =>
      ['Webpack', 'Vite', 'Rollup', 'Parcel', 'ESBuild'].includes(tech)
    );
  }

  /**
   * Enhanced analysis methods for richer codebase context
   */

  /**
   * Detects semantic patterns beyond basic architecture
   */
  private detectSemanticPatterns(codebaseIndex: any): string[] {
    const patterns: string[] = [];

    if (!codebaseIndex?.files) return patterns;

    const filesData =
      codebaseIndex.files instanceof Map
        ? Array.from(codebaseIndex.files.values())
        : codebaseIndex.files;

    const content = filesData
      .map((f: any) => f.content || '')
      .join(' ')
      .toLowerCase();

    // Advanced pattern detection
    const semanticChecks = {
      'Event-Driven Architecture':
        /event|emit|listen|publish|subscribe|dispatch/,
      'Reactive Programming': /observable|stream|reactive|rxjs|subject/,
      'Domain-Driven Design': /entity|aggregate|repository|domain|valueobject/,
      'CQRS Pattern': /command|query|handler|mediator/,
      'Microservices Communication':
        /grpc|kafka|rabbitmq|messagebus|servicemesh/,
      'Aspect-Oriented Programming': /aspect|advice|pointcut|crosscutting/,
      'Builder Pattern': /builder|fluent|chain/,
      'State Management': /state|store|reducer|action|saga/,
      'API Gateway Pattern': /gateway|proxy|routing|loadbalancer/,
      'Circuit Breaker': /circuitbreaker|fallback|resilience|retry/,
    };

    Object.entries(semanticChecks).forEach(([pattern, regex]) => {
      if (regex.test(content)) {
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  /**
   * Analyzes naming conventions used in the codebase
   */
  private analyzeNamingConventions(codebaseIndex: any): {
    classPatterns: string[];
    functionPatterns: string[];
    filePatterns: string[];
    commonPrefixes: string[];
    commonSuffixes: string[];
  } {
    const conventions = {
      classPatterns: [] as string[],
      functionPatterns: [] as string[],
      filePatterns: [] as string[],
      commonPrefixes: [] as string[],
      commonSuffixes: [] as string[],
    };

    if (!codebaseIndex?.symbols) return conventions;

    const classes: string[] = [];
    const functions: string[] = [];
    const files: string[] = [];

    // Extract symbols
    if (codebaseIndex.symbols) {
      codebaseIndex.symbols.forEach((symbol: any) => {
        if (symbol.kind === 'class' || symbol.type === 'class') {
          classes.push(symbol.name);
        } else if (symbol.kind === 'function' || symbol.type === 'function') {
          functions.push(symbol.name);
        }
      });
    }

    // Extract file names
    if (codebaseIndex.files) {
      const filesData =
        codebaseIndex.files instanceof Map
          ? Array.from(codebaseIndex.files.keys())
          : Object.keys(codebaseIndex.files);

      files.push(
        ...filesData.map((f: any) => path.basename(f, path.extname(f)))
      );
    }

    // Analyze class naming patterns
    if (classes.length > 0) {
      const classSuffixes = this.extractCommonSuffixes(classes);
      const classPrefixes = this.extractCommonPrefixes(classes);

      if (classSuffixes.includes('Service'))
        conventions.classPatterns.push('Service classes (FooService)');
      if (classSuffixes.includes('Manager'))
        conventions.classPatterns.push('Manager classes (FooManager)');
      if (classSuffixes.includes('Controller'))
        conventions.classPatterns.push('Controller classes (FooController)');
      if (classSuffixes.includes('Repository'))
        conventions.classPatterns.push('Repository classes (FooRepository)');
      if (
        classPrefixes.includes('I') &&
        classSuffixes.some((s) => s.endsWith('Interface'))
      ) {
        conventions.classPatterns.push('Interface naming (IFooService)');
      }

      conventions.commonSuffixes.push(...classSuffixes.slice(0, 5));
      conventions.commonPrefixes.push(...classPrefixes.slice(0, 3));
    }

    // Analyze function naming patterns
    if (functions.length > 0) {
      const hasGetPrefix = functions.some((f) => f.startsWith('get'));
      const hasSetPrefix = functions.some((f) => f.startsWith('set'));
      const hasIsPrefix = functions.some((f) => f.startsWith('is'));
      const hasCreatePrefix = functions.some((f) => f.startsWith('create'));

      if (hasGetPrefix && hasSetPrefix)
        conventions.functionPatterns.push('Getter/Setter pattern');
      if (hasIsPrefix)
        conventions.functionPatterns.push('Boolean predicate pattern (isFoo)');
      if (hasCreatePrefix)
        conventions.functionPatterns.push('Factory method pattern (createFoo)');
    }

    // Analyze file naming patterns
    if (files.length > 0) {
      const kebabCase = files.some((f) => f.includes('-'));
      const camelCase = files.some((f) => /^[a-z][a-zA-Z]*$/.test(f));
      const pascalCase = files.some((f) => /^[A-Z][a-zA-Z]*$/.test(f));

      if (kebabCase) conventions.filePatterns.push('Kebab-case files');
      if (camelCase) conventions.filePatterns.push('CamelCase files');
      if (pascalCase) conventions.filePatterns.push('PascalCase files');
    }

    return conventions;
  }

  /**
   * Analyzes code quality indicators
   */
  private analyzeCodeQuality(codebaseIndex: any): {
    complexity: 'low' | 'medium' | 'high';
    testCoverage: 'low' | 'medium' | 'high';
    documentation: 'sparse' | 'moderate' | 'comprehensive';
    maintainabilityScore: number;
    issues: string[];
  } {
    let complexity: 'low' | 'medium' | 'high' = 'medium';
    let testCoverage: 'low' | 'medium' | 'high' = 'medium';
    let documentation: 'sparse' | 'moderate' | 'comprehensive' = 'moderate';
    const maintainabilityScore = 0.7;
    const issues: string[] = [];

    if (!codebaseIndex?.files) {
      return {
        complexity,
        testCoverage,
        documentation,
        maintainabilityScore,
        issues,
      };
    }

    const filesData =
      codebaseIndex.files instanceof Map
        ? Array.from(codebaseIndex.files.values())
        : codebaseIndex.files;

    const allFiles = filesData.map((f: any) => f.path.toLowerCase());
    const totalFiles = allFiles.length;

    // Test coverage analysis
    const testFiles = allFiles.filter(
      (f: string) =>
        f.includes('test') ||
        f.includes('spec') ||
        f.endsWith('.test.js') ||
        f.endsWith('.test.ts')
    );
    const testRatio = testFiles.length / Math.max(totalFiles * 0.5, 1);

    if (testRatio > 0.8) testCoverage = 'high';
    else if (testRatio < 0.3) testCoverage = 'low';

    // Documentation analysis
    const docFiles = allFiles.filter(
      (f: string) =>
        f.includes('readme') || f.includes('doc') || f.endsWith('.md')
    );
    const docRatio = docFiles.length / Math.max(totalFiles * 0.1, 1);

    if (docRatio > 1.0) documentation = 'comprehensive';
    else if (docRatio < 0.2) documentation = 'sparse';

    // Complexity analysis
    if (codebaseIndex.classes?.size > 100) {
      complexity = 'high';
      issues.push('Large number of classes may indicate high complexity');
    }

    if (totalFiles > 200) {
      issues.push('Large codebase - consider modularization strategies');
    }

    if (testCoverage === 'low') {
      issues.push('Low test coverage - testing strategy needs improvement');
    }

    if (documentation === 'sparse') {
      issues.push(
        'Limited documentation - consider adding more comprehensive docs'
      );
    }

    return {
      complexity,
      testCoverage,
      documentation,
      maintainabilityScore,
      issues,
    };
  }
  /**
   * Assesses project maturity level
   */
  private assessProjectMaturity(codebaseIndex: any): {
    level: 'early' | 'developing' | 'mature' | 'legacy';
    indicators: string[];
    suggestedImprovements: string[];
  } {
    let level: 'early' | 'developing' | 'mature' | 'legacy' = 'developing';
    const indicators: string[] = [];
    const suggestedImprovements: string[] = [];

    if (!codebaseIndex?.files) {
      return { level, indicators, suggestedImprovements };
    }

    const filesData =
      codebaseIndex.files instanceof Map
        ? Array.from(codebaseIndex.files.values())
        : codebaseIndex.files;

    const allFiles = filesData.map((f: any) => f.path.toLowerCase());

    // Maturity indicators
    const hasCI = allFiles.some(
      (f: any) =>
        f.includes('.github') || f.includes('jenkins') || f.includes('ci')
    );
    const hasTests = allFiles.some(
      (f: any) => f.includes('test') || f.includes('spec')
    );
    const hasDocumentation = allFiles.some(
      (f: any) => f.includes('readme') || f.includes('doc')
    );
    const hasTypeChecking = allFiles.some(
      (f: any) => f.endsWith('.ts') || f.includes('types')
    );
    const hasLinting = allFiles.some(
      (f: any) => f.includes('eslint') || f.includes('prettier')
    );
    const hasPackageManagement = allFiles.some(
      (f: any) => f.includes('package.json') || f.includes('yarn.lock')
    );

    let maturityScore = 0;

    if (hasCI) {
      maturityScore++;
      indicators.push('CI/CD pipeline');
    }
    if (hasTests) {
      maturityScore++;
      indicators.push('Test suite');
    }
    if (hasDocumentation) {
      maturityScore++;
      indicators.push('Documentation');
    }
    if (hasTypeChecking) {
      maturityScore++;
      indicators.push('Type checking');
    }
    if (hasLinting) {
      maturityScore++;
      indicators.push('Code quality tools');
    }
    if (hasPackageManagement) {
      maturityScore++;
      indicators.push('Package management');
    }

    // Determine maturity level
    if (maturityScore <= 2) {
      level = 'early';
      suggestedImprovements.push(
        'Add testing framework',
        'Implement CI/CD',
        'Add documentation'
      );
    } else if (maturityScore <= 4) {
      level = 'developing';
      suggestedImprovements.push(
        'Enhance test coverage',
        'Add type checking',
        'Improve documentation'
      );
    } else {
      level = 'mature';
      suggestedImprovements.push(
        'Consider performance optimization',
        'Add monitoring',
        'Implement advanced patterns'
      );
    }

    // Check for legacy indicators
    const hasOldDependencies = allFiles.some(
      (f: any) => f.includes('bower') || f.includes('grunt')
    );
    if (hasOldDependencies) {
      level = 'legacy';
      suggestedImprovements.push(
        'Modernize build tools',
        'Update dependencies',
        'Refactor legacy code'
      );
    }

    return { level, indicators, suggestedImprovements };
  }

  /**
   * Extracts domain context from codebase
   */
  private extractDomainContext(codebaseIndex: any): {
    businessDomain: string[];
    technicalDomain: string[];
    integrationPatterns: string[];
    apiStyles: string[];
  } {
    const context = {
      businessDomain: [] as string[],
      technicalDomain: [] as string[],
      integrationPatterns: [] as string[],
      apiStyles: [] as string[],
    };

    if (!codebaseIndex?.files) return context;

    const filesData =
      codebaseIndex.files instanceof Map
        ? Array.from(codebaseIndex.files.values())
        : codebaseIndex.files;

    const content = filesData
      .map((f: any) => f.content || '')
      .join(' ')
      .toLowerCase();

    const classNames = Array.from(codebaseIndex.classes?.keys() || []);

    // Business domain detection
    const businessKeywords = [
      'user',
      'customer',
      'order',
      'payment',
      'product',
      'inventory',
      'account',
      'billing',
    ];
    businessKeywords.forEach((keyword) => {
      if (
        content.includes(keyword) ||
        classNames.some((c: any) => String(c).toLowerCase().includes(keyword))
      ) {
        if (!context.businessDomain.includes(keyword)) {
          context.businessDomain.push(keyword);
        }
      }
    });

    // Technical domain detection
    const technicalKeywords = [
      'api',
      'service',
      'repository',
      'controller',
      'middleware',
      'cache',
      'database',
    ];
    technicalKeywords.forEach((keyword) => {
      if (
        content.includes(keyword) ||
        classNames.some((c: any) => String(c).toLowerCase().includes(keyword))
      ) {
        if (!context.technicalDomain.includes(keyword)) {
          context.technicalDomain.push(keyword);
        }
      }
    });

    // Integration patterns
    if (content.includes('rest') || content.includes('api'))
      context.integrationPatterns.push('REST API');
    if (content.includes('graphql'))
      context.integrationPatterns.push('GraphQL');
    if (content.includes('grpc')) context.integrationPatterns.push('gRPC');
    if (content.includes('websocket'))
      context.integrationPatterns.push('WebSocket');
    if (content.includes('webhook'))
      context.integrationPatterns.push('Webhooks');

    // API styles
    if (content.includes('swagger') || content.includes('openapi'))
      context.apiStyles.push('OpenAPI/Swagger');
    if (content.includes('jsonapi')) context.apiStyles.push('JSON:API');
    if (content.includes('hal') || content.includes('hateoas'))
      context.apiStyles.push('HAL/HATEOAS');

    return context;
  }

  /**
   * Helper method to extract common suffixes from a list of names
   */
  private extractCommonSuffixes(names: string[]): string[] {
    const suffixCount: Record<string, number> = {};

    names.forEach((name) => {
      const suffixes = this.getPossibleSuffixes(name);
      suffixes.forEach((suffix) => {
        suffixCount[suffix] = (suffixCount[suffix] || 0) + 1;
      });
    });

    return Object.entries(suffixCount)
      .filter(([, count]) => count >= Math.max(2, names.length * 0.2))
      .sort(([, a], [, b]) => b - a)
      .map(([suffix]) => suffix);
  }

  /**
   * Helper method to extract common prefixes from a list of names
   */
  private extractCommonPrefixes(names: string[]): string[] {
    const prefixCount: Record<string, number> = {};

    names.forEach((name) => {
      const prefixes = this.getPossiblePrefixes(name);
      prefixes.forEach((prefix) => {
        prefixCount[prefix] = (prefixCount[prefix] || 0) + 1;
      });
    });

    return Object.entries(prefixCount)
      .filter(([, count]) => count >= Math.max(2, names.length * 0.2))
      .sort(([, a], [, b]) => b - a)
      .map(([prefix]) => prefix);
  }

  /**
   * Helper method to get possible suffixes from a name
   */
  private getPossibleSuffixes(name: string): string[] {
    const suffixes: string[] = [];
    const words = name.split(/(?=[A-Z])/); // Split on capital letters

    if (words.length > 1) {
      for (let i = 1; i < words.length; i++) {
        suffixes.push(words.slice(i).join(''));
      }
    }

    return suffixes.filter((s) => s.length > 2 && s.length < name.length);
  }

  /**
   * Helper method to get possible prefixes from a name
   */
  private getPossiblePrefixes(name: string): string[] {
    const prefixes: string[] = [];

    // Single letter prefixes (like 'I' for interfaces)
    if (name.length > 2 && /^[A-Z][a-z]*[A-Z]/.test(name)) {
      prefixes.push(name[0]);
    }

    // Word-based prefixes
    const words = name.split(/(?=[A-Z])/);
    if (words.length > 1) {
      for (let i = 1; i < words.length; i++) {
        prefixes.push(words.slice(0, i).join(''));
      }
    }

    return prefixes.filter((p) => p.length > 0 && p.length < name.length - 2);
  }

  /**
   * Analyzes git history for additional context
   */
  private async analyzeGitHistory(workingDirectory: string): Promise<any> {
    try {
      const { stdout: commits } = await execAsync('git rev-list --count HEAD', {
        cwd: workingDirectory,
      });
      const { stdout: recentFiles } = await execAsync(
        'git log --name-only --pretty=format: --since="1 month ago" | sort | uniq -c | sort -nr | head -10',
        { cwd: workingDirectory }
      );

      return {
        totalCommits: parseInt(commits.trim()),
        frequentlyModifiedFiles: recentFiles
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.match(/^\d+$/))
          .slice(0, 5),
        commonChangePatterns: ['feature additions', 'bug fixes', 'refactoring'],
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Stores generated prompts in memory service
   */
  private async storePromptsInMemory(
    generatedPrompts: GeneratedPrompts
  ): Promise<void> {
    try {
      await this.memoryService.addConversation(
        'suggest-prompts execution',
        `Generated ${generatedPrompts.prompts.length} AI prompts`,
        {} as ContextInfo,
        generatedPrompts.metadata.aiModel as any
      );
    } catch (error) {
      console.warn(chalk.yellow('Warning: Failed to store prompts in memory'));
    }
  }

  /**
   * Displays generated prompts to the user
   */
  private displayPrompts(
    generatedPrompts: GeneratedPrompts,
    options: PromptGenerationOptions
  ): void {
    console.log(chalk.green('\n✅ Generated AI Prompts\n'));

    // Group by category
    const groupedPrompts = this.groupPromptsByCategory(
      generatedPrompts.prompts
    );

    Object.entries(groupedPrompts).forEach(([category, prompts]) => {
      console.log(
        chalk.blue(`\n📂 ${category.toUpperCase()} (${prompts.length} prompts)`)
      );
      console.log(chalk.gray('─'.repeat(50)));

      prompts.forEach((prompt, index) => {
        console.log(chalk.white(`\n${index + 1}. ${prompt.title}`));
        console.log(chalk.gray(`   Difficulty: ${prompt.difficulty}`));
        console.log(chalk.gray(`   Tags: ${prompt.tags.join(', ')}`));
        console.log(chalk.cyan(`   "${prompt.prompt}"`));
        if (prompt.description) {
          console.log(chalk.gray(`   → ${prompt.description}`));
        }
      });
    });

    console.log(chalk.green(`\n📊 Summary:`));
    console.log(
      chalk.white(`   Total prompts: ${generatedPrompts.prompts.length}`)
    );
    console.log(
      chalk.white(`   Categories: ${Object.keys(groupedPrompts).length}`)
    );
    console.log(
      chalk.white(
        `   Codebase-specific: ${
          generatedPrompts.prompts.filter((p) => p.codebaseSpecific).length
        }`
      )
    );

    if (options.outputPath) {
      if (options.outputFormat === 'markdown') {
        console.log(
          chalk.blue(`   Each prompt will be saved as a separate markdown file`)
        );
        console.log(
          chalk.blue(`   Output directory: ${path.dirname(options.outputPath)}`)
        );
      } else {
        console.log(chalk.blue(`   Saved to: ${options.outputPath}`));
      }
    }
  }

  /**
   * Groups prompts by category
   */
  private groupPromptsByCategory(
    prompts: GeneratedPrompt[]
  ): Record<string, GeneratedPrompt[]> {
    return prompts.reduce((groups, prompt) => {
      const category = prompt.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(prompt);
      return groups;
    }, {} as Record<string, GeneratedPrompt[]>);
  }

  /**
   * Saves prompts to file in specified format
   */
  private async savePromptsToFile(
    generatedPrompts: GeneratedPrompts,
    options: PromptGenerationOptions
  ): Promise<void> {
    if (!options.outputPath) return;

    try {
      const outputDir = path.dirname(options.outputPath);
      const baseFileName = path.basename(
        options.outputPath,
        path.extname(options.outputPath)
      );

      // Ensure the directory exists
      await fs.mkdir(outputDir, { recursive: true });

      if (options.outputFormat === 'markdown') {
        // Save each prompt as a separate markdown file
        const savedFiles = await this.saveIndividualMarkdownFiles(
          generatedPrompts,
          outputDir,
          baseFileName
        );

        console.log(
          chalk.green(
            `\n💾 Generated ${savedFiles.length} individual prompt files:`
          )
        );
        savedFiles.forEach((file, index) => {
          console.log(chalk.gray(`   ${index + 1}. ${file}`));
        });

        // Also create a summary index file
        const indexContent = this.createSummaryMarkdown(
          generatedPrompts,
          savedFiles
        );
        const indexPath = path.join(outputDir, `prompt-index.md`);
        await fs.writeFile(indexPath, indexContent, 'utf-8');
        console.log(chalk.blue(`\n📋 Summary index saved to: ${indexPath}`));
      } else {
        // For JSON and YAML, keep the original behavior (single file)
        let content: string;

        switch (options.outputFormat) {
          case 'json':
            content = JSON.stringify(generatedPrompts, null, 2);
            break;
          case 'yaml':
            content = this.convertToYaml(generatedPrompts);
            break;
          default:
            content = this.convertToMarkdown(generatedPrompts);
            break;
        }

        await fs.writeFile(options.outputPath, content, 'utf-8');
        console.log(
          chalk.green(`\n💾 Prompts saved to: ${options.outputPath}`)
        );
      }
    } catch (error) {
      console.error(chalk.red(`Failed to save prompts: ${error}`));
    }
  }

  /**
   * Converts prompts to Markdown format
   */
  private convertToMarkdown(generatedPrompts: GeneratedPrompts): string {
    const { prompts, metadata } = generatedPrompts;
    const groupedPrompts = this.groupPromptsByCategory(prompts);

    let markdown = `# AI Prompts for ${metadata.codebaseAnalysis.projectType} Project\n\n`;

    markdown += `## Project Overview\n\n`;
    markdown += `- **Primary Language:** ${metadata.codebaseAnalysis.primaryLanguage}\n`;
    markdown += `- **Architecture:** ${metadata.codebaseAnalysis.architecture}\n`;
    markdown += `- **Technologies:** ${metadata.codebaseAnalysis.technologies.join(
      ', '
    )}\n`;
    markdown += `- **Generated:** ${metadata.generatedAt.toISOString()}\n`;
    markdown += `- **Total Prompts:** ${metadata.totalGenerated}\n\n`;

    Object.entries(groupedPrompts).forEach(([category, categoryPrompts]) => {
      markdown += `## ${
        category.charAt(0).toUpperCase() + category.slice(1)
      } Prompts\n\n`;

      categoryPrompts.forEach((prompt, index) => {
        markdown += `### ${index + 1}. ${prompt.title}\n\n`;
        markdown += `**Difficulty:** ${prompt.difficulty}  \n`;
        markdown += `**Tags:** ${prompt.tags.join(', ')}  \n\n`;
        markdown += `**Prompt:**\n`;
        markdown += `\`\`\`\n${prompt.prompt}\n\`\`\`\n\n`;
        if (prompt.description) {
          markdown += `**Description:** ${prompt.description}\n\n`;
        }
        if (prompt.example) {
          markdown += `**Example:**\n\`\`\`\n${prompt.example}\n\`\`\`\n\n`;
        }
        markdown += `---\n\n`;
      });
    });

    return markdown;
  }

  /**
   * Converts prompts to YAML format
   */
  private convertToYaml(generatedPrompts: GeneratedPrompts): string {
    // Simple YAML conversion (in a real implementation, you'd use a YAML library)
    const yaml = `metadata:
  totalGenerated: ${generatedPrompts.metadata.totalGenerated}
  generatedAt: "${generatedPrompts.metadata.generatedAt.toISOString()}"
  aiModel: "${generatedPrompts.metadata.aiModel}"
  codebaseAnalysis:
    projectType: "${generatedPrompts.metadata.codebaseAnalysis.projectType}"
    primaryLanguage: "${
      generatedPrompts.metadata.codebaseAnalysis.primaryLanguage
    }"
    architecture: "${generatedPrompts.metadata.codebaseAnalysis.architecture}"

prompts:
${generatedPrompts.prompts
  .map(
    (prompt) => `  - id: "${prompt.id}"
    title: "${prompt.title}"
    category: "${prompt.category}"
    difficulty: "${prompt.difficulty}"
    codebaseSpecific: ${prompt.codebaseSpecific}
    tags: [${prompt.tags.map((tag) => `"${tag}"`).join(', ')}]
    prompt: |
      ${prompt.prompt
        .split('\n')
        .map((line) => `      ${line}`)
        .join('\n')}
    description: "${prompt.description}"`
  )
  .join('\n')}
`;

    return yaml;
  }

  /**
   * Saves each prompt as a separate markdown file
   */
  private async saveIndividualMarkdownFiles(
    generatedPrompts: GeneratedPrompts,
    outputDir: string,
    baseFileName: string
  ): Promise<string[]> {
    const savedFiles: string[] = [];
    const { prompts, metadata } = generatedPrompts;
    const usedFileNames = new Set<string>();

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      let sanitizedTitle = this.sanitizeFileName(prompt.title);
      let fileName = `${sanitizedTitle}.prompt.md`;

      // Handle duplicate filenames by adding a suffix
      let counter = 1;
      while (usedFileNames.has(fileName)) {
        fileName = `${sanitizedTitle}-${counter}.prompt.md`;
        counter++;
      }

      usedFileNames.add(fileName);
      const filePath = path.join(outputDir, fileName);

      const content = this.convertSinglePromptToMarkdown(prompt, metadata);
      await fs.writeFile(filePath, content, 'utf-8');

      savedFiles.push(fileName);
    }

    return savedFiles;
  }

  /**
   * Converts a single prompt to markdown format
   */
  private convertSinglePromptToMarkdown(
    prompt: GeneratedPrompt,
    metadata: GeneratedPrompts['metadata']
  ): string {
    const markdown = `# ${prompt.title}

## Metadata

- **ID:** ${prompt.id}
- **Category:** ${prompt.category}
- **Difficulty:** ${prompt.difficulty}
- **Codebase Specific:** ${prompt.codebaseSpecific ? 'Yes' : 'No'}
- **Tags:** ${prompt.tags.join(', ')}
- **Generated:** ${metadata.generatedAt.toISOString()}

## Project Context

- **Project Type:** ${metadata.codebaseAnalysis.projectType}
- **Primary Language:** ${metadata.codebaseAnalysis.primaryLanguage}
- **Architecture:** ${metadata.codebaseAnalysis.architecture}
- **Technologies:** ${metadata.codebaseAnalysis.technologies.join(', ')}

## Description

${prompt.description}

## Prompt

\`\`\`
${prompt.prompt}
\`\`\`

${
  prompt.example
    ? `## Example Usage

\`\`\`
${prompt.example}
\`\`\`

`
    : ''
}---

*Generated by AIA Suggest Prompts Command*
`;

    return markdown;
  }

  /**
   * Creates a summary index markdown file
   */
  private createSummaryMarkdown(
    generatedPrompts: GeneratedPrompts,
    savedFiles: string[]
  ): string {
    const { prompts, metadata } = generatedPrompts;
    const groupedPrompts = this.groupPromptsByCategory(prompts);

    let markdown = `# AI Prompts Index

## Project Overview

- **Project Type:** ${metadata.codebaseAnalysis.projectType}
- **Primary Language:** ${metadata.codebaseAnalysis.primaryLanguage}
- **Architecture:** ${metadata.codebaseAnalysis.architecture}
- **Technologies:** ${metadata.codebaseAnalysis.technologies.join(', ')}
- **Generated:** ${metadata.generatedAt.toISOString()}
- **Total Prompts:** ${metadata.totalGenerated}

## Generated Prompt Files

`;

    let fileIndex = 0;
    Object.entries(groupedPrompts).forEach(([category, categoryPrompts]) => {
      markdown += `### ${
        category.charAt(0).toUpperCase() + category.slice(1)
      } Prompts\n\n`;

      categoryPrompts.forEach((prompt) => {
        const fileName = savedFiles[fileIndex];
        markdown += `- **[${prompt.title}](./${fileName})** (${prompt.difficulty})\n`;
        markdown += `  - *${prompt.description}*\n`;
        markdown += `  - Tags: ${prompt.tags.join(', ')}\n\n`;
        fileIndex++;
      });
    });

    markdown += `---

*Generated by AIA Suggest Prompts Command - ${metadata.totalGenerated} prompts saved as individual files*
`;

    return markdown;
  }

  /**
   * Sanitizes a string to be used as a filename
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .toLowerCase()
      .substring(0, 50) // Limit length to 50 characters
      .replace(/-$/, ''); // Remove trailing hyphen
  }
}
