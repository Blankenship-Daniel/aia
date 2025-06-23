# Prompt: Implement `suggest-prompts` Command for AIA CLI

## Objective

Create a new command `suggest-prompts` (with aliases `sp`, `prompts`) for the AIA CLI that uses GenAI to analyze a codebase and generate contextually relevant, reusable prompts that developers can use with AI assistants to work more effectively with their code.

## Command Overview

```bash
aia suggest-prompts [options]
aia sp
aia prompts --category refactoring --count 10
```

## Implementation Requirements

### 1. Create Command Class: `SuggestPromptsCommand`

Create a new file `src/commands/SuggestPromptsCommand.ts` that implements the `ICommand` interface following the established patterns in the codebase.

```typescript
import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IAIService } from '../interfaces/IAIService';
import { ICodeIndexService } from '../interfaces/ICodeIndexService';
import { IContextService } from '../interfaces/IContextService';
import { CommandResult, CommandOptions } from '../types/index';
// ... other imports

export class SuggestPromptsCommand implements ICommand {
  public readonly name = 'suggest-prompts';
  public readonly description =
    'Generate reusable AI prompts tailored to your codebase';

  constructor(
    private aiService: IAIService,
    private codeIndexService: ICodeIndexService,
    private contextService: IContextService,
    private memoryService: IMemoryService
  ) {}

  getDefinition(): CommandDefinition {
    return {
      name: 'suggest-prompts',
      description: 'Generate reusable AI prompts tailored to your codebase',
      usage: 'aia suggest-prompts [options]',
      examples: [
        'aia suggest-prompts',
        'aia suggest-prompts --category refactoring',
        'aia sp --count 10 --output prompts.md',
        'aia prompts --analyze-deep --include-examples',
      ],
      aliases: ['sp', 'prompts'],
      options: [
        {
          name: 'category',
          description:
            'Filter prompts by category (refactoring, debugging, testing, documentation, security, performance)',
          type: 'string',
        },
        {
          name: 'count',
          description: 'Number of prompts to generate per category',
          type: 'number',
          default: 5,
        },
        {
          name: 'output',
          description: 'Output file path for generated prompts',
          type: 'string',
        },
        {
          name: 'analyze-deep',
          description:
            'Perform deep analysis including git history and patterns',
          type: 'boolean',
          default: false,
        },
        {
          name: 'include-examples',
          description: 'Include code examples with each prompt',
          type: 'boolean',
          default: true,
        },
        {
          name: 'format',
          description: 'Output format (markdown, json, yaml)',
          type: 'string',
          default: 'markdown',
        },
      ],
    };
  }

  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    // Implementation details below
  }
}
```

### 2. Core Functionality Implementation

The command should:

#### a) Analyze the Codebase

- Use `ICodeIndexService` to load the existing codebase index
- Gather enhanced context using `IContextService`
- Analyze patterns, technologies, and project structure

#### b) Generate Context-Aware Prompts Using GenAI

Create a comprehensive prompt for the AI that includes:

```typescript
private async generatePromptsWithAI(
  codebaseAnalysis: CodebaseAnalysis,
  category: string | undefined,
  count: number,
  includeExamples: boolean
): Promise<GeneratedPrompts> {
  const aiPrompt = `You are an expert software engineer analyzing a ${codebaseAnalysis.projectType} codebase.

CODEBASE CONTEXT:
- Project Type: ${codebaseAnalysis.projectType}
- Primary Language: ${codebaseAnalysis.primaryLanguage}
- Architecture: ${codebaseAnalysis.architecture}
- Key Technologies: ${codebaseAnalysis.technologies.join(', ')}
- Total Files: ${codebaseAnalysis.fileCount}
- Key Components: ${codebaseAnalysis.keyComponents.join(', ')}

TASK: Generate ${count} highly specific, reusable prompts that developers can use with AI assistants when working on this codebase.

${category ? `Focus on ${category} prompts only.` : 'Generate prompts across all categories.'}

CATEGORIES TO CONSIDER:
1. Refactoring - Improve code quality, patterns, and structure
2. Debugging - Troubleshoot issues and analyze problems
3. Testing - Write tests, improve coverage, test strategies
4. Documentation - Generate docs, comments, and explanations
5. Security - Identify vulnerabilities and improve security
6. Performance - Optimize code and identify bottlenecks
7. Architecture - Design patterns and structural improvements
8. Code Review - Review guidelines and quality checks

For each prompt, provide:
{
  "id": "unique-id",
  "category": "category-name",
  "title": "Short descriptive title",
  "prompt": "The actual prompt text that developers would use",
  "description": "Brief explanation of when to use this prompt",
  "tags": ["relevant", "tags"],
  ${includeExamples ? '"exampleUsage": "Example of how to use this prompt with context",' : ''}
  "expectedOutcome": "What the AI should provide",
  "bestPractices": ["Tips for using this prompt effectively"]
}

IMPORTANT GUIDELINES:
- Make prompts specific to this codebase's technologies and patterns
- Include references to actual components, services, or patterns found
- Prompts should be reusable across different parts of the codebase
- Focus on real-world development scenarios
- Ensure prompts encourage best practices for this tech stack

Generate prompts as a JSON array.`;

  const response = await this.aiService.queryAI(
    aiPrompt,
    await this.contextService.gatherContext()
  );

  return this.parseAIResponse(response.content);
}
```

#### c) Prompt Categories

Generate prompts for these categories:

- **Refactoring**: Code improvement, pattern implementation, technical debt
- **Debugging**: Error analysis, performance issues, bug hunting
- **Testing**: Test generation, coverage improvement, test strategies
- **Documentation**: Code documentation, API docs, architecture docs
- **Security**: Vulnerability analysis, security best practices
- **Performance**: Optimization, profiling, bottleneck identification
- **Architecture**: Design patterns, structure improvements, scalability
- **Code Review**: Review checklists, quality gates, standards compliance

#### d) Deep Analysis Features

When `--analyze-deep` is enabled:

- Analyze git history for common change patterns
- Identify frequently modified files
- Detect code smells and anti-patterns
- Consider team conventions from existing code

### 3. Output Generation

Support multiple output formats:

```typescript
private formatOutput(
  prompts: GeneratedPrompt[],
  format: string,
  outputPath?: string
): string {
  switch (format) {
    case 'markdown':
      return this.generateMarkdownOutput(prompts);
    case 'json':
      return JSON.stringify(prompts, null, 2);
    case 'yaml':
      return this.generateYamlOutput(prompts);
    default:
      return this.generateMarkdownOutput(prompts);
  }
}

private generateMarkdownOutput(prompts: GeneratedPrompt[]): string {
  let output = '# AI Prompts for Your Codebase\n\n';
  output += `Generated on: ${new Date().toISOString()}\n\n`;

  const categories = [...new Set(prompts.map(p => p.category))];

  for (const category of categories) {
    output += `## ${category} Prompts\n\n`;
    const categoryPrompts = prompts.filter(p => p.category === category);

    for (const prompt of categoryPrompts) {
      output += `### ${prompt.title}\n\n`;
      output += `**Description:** ${prompt.description}\n\n`;
      output += `**Prompt:**\n\`\`\`\n${prompt.prompt}\n\`\`\`\n\n`;
      if (prompt.exampleUsage) {
        output += `**Example Usage:**\n${prompt.exampleUsage}\n\n`;
      }
      output += `**Expected Outcome:** ${prompt.expectedOutcome}\n\n`;
      output += `**Best Practices:**\n`;
      prompt.bestPractices.forEach(bp => {
        output += `- ${bp}\n`;
      });
      output += `\n**Tags:** ${prompt.tags.join(', ')}\n\n---\n\n`;
    }
  }

  return output;
}
```

### 4. Integration with Existing Systems

#### a) Register in CommandFactoryV2

Add the command to CommandFactoryV2.ts:

```typescript
// In createCommandRegistry method
registry.set(
  'suggest-prompts',
  () =>
    new SuggestPromptsCommand(
      this.serviceRegistry.get<IAIService>('ai')!,
      this.serviceRegistry.get<ICodeIndexService>('codeIndex')!,
      this.serviceRegistry.get<IContextService>('context')!,
      this.serviceRegistry.get<IMemoryService>('memory')!
    )
);
```

#### b) Memory Integration

Store generated prompts in memory for future reference:

```typescript
// Store successful prompt generation
await this.memoryService.addConversation({
  timestamp: new Date().toISOString(),
  question: `Generated ${
    prompts.length
  } prompts for categories: ${categories.join(', ')}`,
  answer: `Successfully generated context-aware prompts for the codebase`,
  context: {
    command: 'suggest-prompts',
    promptCount: prompts.length,
    categories: categories,
  },
});
```

### 5. Example Generated Prompts

The AI should generate prompts like:

```markdown
### Refactor Service Dependencies

**Prompt:** "Analyze the dependency injection pattern in [ServiceName] and suggest refactoring to reduce coupling. Consider the existing IService interfaces and the service registry pattern used throughout the codebase."

### Debug Async Command Execution

**Prompt:** "Help me debug why the [CommandName] command is hanging during async execution. The command implements ICommand interface and uses the standard execute() pattern. Include checks for proper promise handling and timeout configuration."

### Generate Integration Tests

**Prompt:** "Create integration tests for the [FeatureName] functionality that follows the existing test patterns in tests/integration/. Use the established mock services and test utilities."
```

### 6. Advanced Features

#### a) Learning from Usage

- Track which prompts are most used (via memory service)
- Refine prompt generation based on team preferences
- Suggest prompts based on recent development activities

#### b) Context-Aware Suggestions

- Detect current file/component being worked on
- Suggest prompts relevant to the current context
- Integration with IDE workflow

#### c) Prompt Templates

- Allow users to create custom prompt templates
- Store templates in `.aia/prompt-templates/`
- Merge custom templates with AI-generated ones

### 7. Error Handling and Validation

Implement robust error handling:

```typescript
try {
  // Ensure codebase is indexed
  const index = await this.codeIndexService.loadIndex();
  if (!index) {
    console.log(chalk.yellow('No index found. Building index first...'));
    // Trigger index build
  }

  // Validate AI service is configured
  if (!this.aiService.isConfigured()) {
    return {
      success: false,
      error: 'AI service not configured. Run "aia config" first.',
    };
  }

  // Generate prompts with retry logic
  const prompts = await this.generateWithRetry(analysis, options);
} catch (error) {
  return {
    success: false,
    error: `Failed to generate prompts: ${error.message}`,
  };
}
```

### 8. Testing Requirements

Create comprehensive tests:

- Unit tests for prompt generation logic
- Integration tests with AI service
- Mock AI responses for consistent testing
- Validate output format generation

### 9. Documentation

Update README.md with the new command:

````markdown
### `suggest-prompts` / `sp`, `prompts`

**Description:** Generate reusable AI prompts tailored to your codebase using GenAI analysis.

**Usage:**

```bash
aia suggest-prompts [options]
aia sp --category debugging
aia prompts --count 20 --output my-prompts.md
```
````

**Options:**

- `--category <category>`: Filter by category (refactoring, debugging, testing, etc.)
- `--count <n>`: Number of prompts per category (default: 5)
- `--output <file>`: Save prompts to file
- `--analyze-deep`: Perform deep codebase analysis
- `--include-examples`: Include usage examples
- `--format <format>`: Output format (markdown, json, yaml)

**Examples:**

- `aia suggest-prompts` - Generate default set of prompts
- `aia sp --category testing --count 10` - Generate 10 testing prompts
- `aia prompts --analyze-deep --output team-prompts.md` - Deep analysis with file output

```

## Success Criteria

1. Command successfully analyzes the codebase using existing index
2. GenAI generates contextually relevant prompts based on:
   - Project type and technologies
   - Code patterns and architecture
   - Common development tasks
3. Prompts are specific to the codebase, not generic
4. Output is well-formatted and immediately usable
5. Integration with existing AIA systems (memory, context, etc.)
6. Robust error handling and user feedback
7. Performance optimization for large codebases

## Additional Considerations

- Cache generated prompts to avoid redundant AI calls
- Allow filtering and searching through generated prompts
- Consider prompt versioning as codebase evolves
- Integration with VSCode extension for in-editor prompt suggestions
- Export prompts in formats compatible with other AI tools
- Track prompt effectiveness through user feedback

This implementation fully leverages GenAI to provide intelligent, context-aware prompt suggestions that help developers work more effectively with their specific codebase.## Success Criteria

1. Command successfully analyzes the codebase using existing index
2. GenAI generates contextually relevant prompts based on:
   - Project type and technologies
   - Code patterns and architecture
   - Common development tasks
3. Prompts are specific to the codebase, not generic
4. Output is well-formatted and immediately usable
5. Integration with existing AIA systems (memory, context, etc.)
6. Robust error handling and user feedback
7. Performance optimization for large codebases

## Additional Considerations

- Cache generated prompts to avoid redundant AI calls
- Allow filtering and searching through generated prompts
- Consider prompt versioning as codebase evolves
- Integration with VSCode extension for in-editor prompt suggestions
- Export prompts in formats compatible with other AI tools
- Track prompt effectiveness through user feedback

This implementation fully leverages GenAI to provide intelligent, context-aware prompt suggestions that help developers work more effectively with their specific codebase.
```
