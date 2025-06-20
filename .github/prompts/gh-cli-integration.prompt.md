# GitHub Copilot CLI Integration Implementation Prompt

## Objective
Integrate GitHub Copilot CLI capabilities into the AIA CLI to enhance developer productivity by leveraging Copilot's command explanation, suggestion, and code generation features within AIA's existing architecture.

## Context
- **Project**: AIA CLI (AI Assistant Command Line Interface)
- **Architecture**: TypeScript, Service-Oriented with Dependency Injection
- **Target Integration**: GitHub Copilot CLI (`gh copilot`)
- **Key Commands**: `explain`, `suggest`, `alias`

## Implementation Tasks

### 1. Create Copilot Service Infrastructure

#### Task 1.1: Dependency Checker
```typescript
// filepath: src/services/CopilotDependencyService.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { ICopilotDependencyService } from '../interfaces/ICopilotDependencyService';

export class CopilotDependencyService implements ICopilotDependencyService {
  private execAsync = promisify(exec);

  async checkDependencies(): Promise<{ gh: boolean; copilot: boolean; message?: string }> {
    // Check if gh CLI is installed
    // Check if copilot extension is installed
    // Return status and installation instructions if needed
  }

  async installInstructions(): Promise<string> {
    // Return platform-specific installation instructions
  }
}
```

#### Task 1.2: Copilot Service Interface
```typescript
// filepath: src/interfaces/ICopilotService.ts
export interface ICopilotService {
  explain(command: string): Promise<ExplanationResult>;
  suggest(query: string, context?: CommandContext): Promise<SuggestionResult[]>;
  createAlias(name: string, command: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

export interface ExplanationResult {
  command: string;
  explanation: string;
  components: CommandComponent[];
  examples?: string[];
  warnings?: string[];
}

export interface SuggestionResult {
  command: string;
  description: string;
  confidence: number;
  tags: string[];
}
```

#### Task 1.3: Copilot Service Implementation
```typescript
// filepath: src/services/CopilotService.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { ICopilotService, ExplanationResult, SuggestionResult } from '../interfaces/ICopilotService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { IMemoryCacheService } from '../interfaces/IMemoryCacheService';

export class CopilotService implements ICopilotService {
  private execAsync = promisify(exec);
  
  constructor(
    private configService: IConfigurationService,
    private cacheService: IMemoryCacheService
  ) {}

  async explain(command: string): Promise<ExplanationResult> {
    // Check cache first
    const cacheKey = `copilot:explain:${command}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Execute gh copilot explain
    const { stdout } = await this.execAsync(`gh copilot explain "${command}"`);
    
    // Parse the explanation
    const result = this.parseExplanation(stdout);
    
    // Cache the result
    await this.cacheService.set(cacheKey, result, 3600000); // 1 hour TTL
    
    return result;
  }

  async suggest(query: string, context?: CommandContext): Promise<SuggestionResult[]> {
    // Build context-aware query
    const enhancedQuery = this.enhanceQueryWithContext(query, context);
    
    // Execute gh copilot suggest
    const { stdout } = await this.execAsync(`gh copilot suggest "${enhancedQuery}"`);
    
    // Parse suggestions
    return this.parseSuggestions(stdout);
  }

  private parseExplanation(output: string): ExplanationResult {
    // Parse the copilot output into structured format
  }

  private parseSuggestions(output: string): SuggestionResult[] {
    // Parse multiple suggestions from copilot output
  }
}
```

### 2. Create New AIA Commands

#### Task 2.1: Explain Command
```typescript
// filepath: src/commands/ExplainCommand.ts
import { ICommand } from '../interfaces/ICommand';
import { ICopilotService } from '../interfaces/ICopilotService';
import { IMemoryService } from '../interfaces/IMemoryService';
import chalk from 'chalk';

export class ExplainCommand implements ICommand {
  name = 'explain';
  description = 'Explain a command using GitHub Copilot';
  
  constructor(
    private copilotService: ICopilotService,
    private memoryService: IMemoryService
  ) {}

  async execute(args: string[], options: any): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.red('Please provide a command to explain'));
      return;
    }

    const command = args.join(' ');
    
    try {
      const explanation = await this.copilotService.explain(command);
      
      // Display formatted explanation
      this.displayExplanation(explanation);
      
      // Store in memory for future reference
      await this.memoryService.addEntry({
        type: 'explanation',
        command,
        explanation: explanation.explanation,
        timestamp: new Date()
      });
    } catch (error) {
      console.log(chalk.red('Failed to explain command:', error.message));
    }
  }

  private displayExplanation(result: ExplanationResult): void {
    console.log(chalk.bold('\nCommand:'), chalk.cyan(result.command));
    console.log(chalk.bold('\nExplanation:'));
    console.log(result.explanation);
    
    if (result.components?.length > 0) {
      console.log(chalk.bold('\nComponents:'));
      result.components.forEach(comp => {
        console.log(`  ${chalk.yellow(comp.part)}: ${comp.description}`);
      });
    }
    
    if (result.examples?.length > 0) {
      console.log(chalk.bold('\nExamples:'));
      result.examples.forEach(ex => console.log(`  ${chalk.gray(ex)}`));
    }
  }
}
```

#### Task 2.2: Suggest Command
```typescript
// filepath: src/commands/SuggestCommand.ts
import { ICommand } from '../interfaces/ICommand';
import { ICopilotService } from '../interfaces/ICopilotService';
import { IContextService } from '../interfaces/IContextService';
import inquirer from 'inquirer';
import chalk from 'chalk';

export class SuggestCommand implements ICommand {
  name = 'suggest';
  description = 'Get command suggestions from GitHub Copilot';
  
  constructor(
    private copilotService: ICopilotService,
    private contextService: IContextService
  ) {}

  async execute(args: string[], options: any): Promise<void> {
    const query = args.join(' ');
    if (!query) {
      console.log(chalk.red('Please provide a description of what you want to do'));
      return;
    }

    // Get current context
    const context = await this.contextService.getContext();
    
    try {
      const suggestions = await this.copilotService.suggest(query, context);
      
      if (suggestions.length === 0) {
        console.log(chalk.yellow('No suggestions found'));
        return;
      }

      // Interactive selection
      const { selected } = await inquirer.prompt([{
        type: 'list',
        name: 'selected',
        message: 'Select a command to execute:',
        choices: [
          ...suggestions.map((s, i) => ({
            name: `${i + 1}. ${chalk.cyan(s.command)} - ${s.description}`,
            value: s
          })),
          { name: chalk.gray('Cancel'), value: null }
        ]
      }]);

      if (selected) {
        await this.executeCommand(selected);
      }
    } catch (error) {
      console.log(chalk.red('Failed to get suggestions:', error.message));
    }
  }

  private async executeCommand(suggestion: SuggestionResult): Promise<void> {
    // Confirm and execute the selected command
  }
}
```

#### Task 2.3: Learn Command (Enhanced)
```typescript
// filepath: src/commands/LearnCommand.ts
import { ICommand } from '../interfaces/ICommand';
import { ICopilotService } from '../interfaces/ICopilotService';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';

export class LearnCommand implements ICommand {
  name = 'learn';
  description = 'Interactive learning mode combining Copilot and AI insights';
  
  constructor(
    private copilotService: ICopilotService,
    private aiService: IAIService,
    private contextService: IContextService
  ) {}

  async execute(args: string[], options: any): Promise<void> {
    const topic = args[0] || await this.detectTopic();
    
    // Get context-aware suggestions
    const context = await this.contextService.getContext();
    const suggestions = await this.copilotService.suggest(
      `common ${topic} commands for this project`,
      context
    );

    // Get AI-enhanced explanations
    for (const suggestion of suggestions) {
      const explanation = await this.copilotService.explain(suggestion.command);
      const aiInsights = await this.aiService.generateResponse(
        `Provide best practices and tips for: ${suggestion.command}`
      );
      
      // Display combined learning material
      this.displayLearningContent(suggestion, explanation, aiInsights);
    }
  }

  private async detectTopic(): Promise<string> {
    // Detect project type and suggest relevant topic
  }
}
```

### 3. Service Registration

#### Task 3.1: Update ServiceFactory
```typescript
// filepath: src/container/ServiceFactory.ts
// ...existing code...

import { CopilotService } from '../services/CopilotService';
import { CopilotDependencyService } from '../services/CopilotDependencyService';
import { ExplainCommand } from '../commands/ExplainCommand';
import { SuggestCommand } from '../commands/SuggestCommand';
import { LearnCommand } from '../commands/LearnCommand';

export class ServiceFactory {
  static createServices(container: DIContainer): void {
    // ...existing code...

    // Register Copilot services
    container.register('ICopilotDependencyService', 
      () => new CopilotDependencyService()
    );

    container.register('ICopilotService', 
      (c) => new CopilotService(
        c.resolve('IConfigurationService'),
        c.resolve('IMemoryCacheService')
      )
    );

    // Register new commands
    container.register('ExplainCommand',
      (c) => new ExplainCommand(
        c.resolve('ICopilotService'),
        c.resolve('IMemoryService')
      )
    );

    container.register('SuggestCommand',
      (c) => new SuggestCommand(
        c.resolve('ICopilotService'),
        c.resolve('IContextService')
      )
    );

    container.register('LearnCommand',
      (c) => new LearnCommand(
        c.resolve('ICopilotService'),
        c.resolve('IAIService'),
        c.resolve('IContextService')
      )
    );

    // ...existing code...
  }
}
```

### 4. Configuration Updates

#### Task 4.1: Add Copilot Configuration
```typescript
// filepath: src/services/ConfigurationService.ts
// ...existing code...

export interface CopilotConfig {
  enabled: boolean;
  cacheExplanations: boolean;
  cacheTTL: number;
  maxSuggestions: number;
  contextEnhancement: boolean;
  safetyCheck: boolean;
}

// Add to default configuration
const defaultConfig = {
  // ...existing code...
  copilot: {
    enabled: true,
    cacheExplanations: true,
    cacheTTL: 3600000, // 1 hour
    maxSuggestions: 5,
    contextEnhancement: true,
    safetyCheck: true
  }
};
```

### 5. Interactive Mode Integration

#### Task 5.1: Enhance Interactive Mode
```typescript
// filepath: src/cli/InteractiveMode.ts
// ...existing code...

// Add Copilot shortcuts
private copilotShortcuts = {
  ':explain': 'Switch to explain mode',
  ':suggest': 'Switch to suggest mode',
  ':learn': 'Enter learning mode',
  '??': 'Quick explain last command'
};

private async handleCopilotMode(input: string): Promise<void> {
  if (input.startsWith('??')) {
    // Quick explain the last executed command
    const lastCommand = await this.commandMemory.getLastCommand();
    if (lastCommand) {
      await this.copilotService.explain(lastCommand);
    }
  }
}
```

### 6. Error Handling and Fallbacks

#### Task 6.1: Graceful Degradation
```typescript
// filepath: src/services/CopilotService.ts
// ...existing code...

async explain(command: string): Promise<ExplanationResult> {
  try {
    // Try Copilot first
    return await this.executeCopilotExplain(command);
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('gh')) {
      // Fallback to AI service
      console.log(chalk.yellow('GitHub Copilot CLI not available, using AI fallback'));
      return await this.aiExplainFallback(command);
    }
    throw error;
  }
}

private async aiExplainFallback(command: string): Promise<ExplanationResult> {
  const aiResponse = await this.aiService.generateResponse(
    `Explain this command in detail: ${command}`
  );
  return this.parseAIExplanation(aiResponse);
}
```

### 7. Testing

#### Task 7.1: Unit Tests
```typescript
// filepath: tests/services/CopilotService.test.ts
import { CopilotService } from '../../src/services/CopilotService';
import { mock } from 'jest-mock-extended';

describe('CopilotService', () => {
  let copilotService: CopilotService;
  let mockConfigService: IConfigurationService;
  let mockCacheService: IMemoryCacheService;

  beforeEach(() => {
    mockConfigService = mock<IConfigurationService>();
    mockCacheService = mock<IMemoryCacheService>();
    copilotService = new CopilotService(mockConfigService, mockCacheService);
  });

  describe('explain', () => {
    it('should return cached explanation if available', async () => {
      // Test cache hit scenario
    });

    it('should call gh copilot explain for new commands', async () => {
      // Test actual Copilot call
    });

    it('should fall back to AI service when Copilot unavailable', async () => {
      // Test fallback mechanism
    });
  });

  describe('suggest', () => {
    it('should enhance query with context', async () => {
      // Test context enhancement
    });

    it('should parse multiple suggestions correctly', async () => {
      // Test suggestion parsing
    });
  });
});
```

## Success Criteria

1. **Seamless Integration**: Copilot commands work within AIA's existing architecture
2. **Performance**: Cached responses return in <100ms
3. **Reliability**: Graceful fallback when Copilot is unavailable
4. **User Experience**: Interactive command selection and clear explanations
5. **Context Awareness**: Suggestions consider current project context
6. **Testing**: 90%+ code coverage for new components
7. **Documentation**: Updated README and command help

## Deliverables

1. Fully functional `explain`, `suggest`, and `learn` commands
2. Copilot service with caching and fallback mechanisms
3. Interactive mode enhancements
4. Comprehensive test suite
5. Updated documentation
6. Configuration options for Copilot features

## Implementation Notes

- Use existing AIA patterns (DI, interfaces, error handling)
- Maintain backward compatibility
- Follow TypeScript best practices
- Implement proper error messages and user guidance
- Consider offline scenarios and network issues
- Respect rate limits