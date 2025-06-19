# SOLID Refactoring Implementation Guide

## Quick Action Items

### Immediate Priority (High Impact, Low Effort)

#### 1. AgentCommand Decomposition

**File**: `src/commands/AgentCommand.ts`
**Issue**: Multiple responsibilities (SRP violation)
**Time Estimate**: 4-6 hours

**Create New Services**:

```typescript
// src/services/AgentExecutionEngine.ts
export interface IAgentExecutionEngine {
  planExecution(goal: string, context: ContextInfo): Promise<ExecutionPlan>;
  executeStep(step: ExecutionStep): Promise<StepResult>;
  validateResult(result: StepResult): Promise<ValidationResult>;
}

// src/services/AgentPresenter.ts
export interface IAgentPresenter {
  showPlanningPhase(): void;
  showExecutionStep(step: ExecutionStep): void;
  showResult(result: CommandResult): void;
}

// src/services/ResilienceService.ts
export interface IResilienceService {
  executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T>;
  executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T>;
  executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number
  ): Promise<T>;
}
```

**Refactored AgentCommand**:

```typescript
export class AgentCommand implements ICommand {
  constructor(
    private executionEngine: IAgentExecutionEngine,
    private presenter: IAgentPresenter,
    private resilienceService: IResilienceService
  ) {}

  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    const goal = args.join(' ');

    try {
      this.presenter.showPlanningPhase();
      const plan = await this.executionEngine.planExecution(goal, context);

      const results = [];
      for (const step of plan.steps) {
        this.presenter.showExecutionStep(step);
        const result = await this.resilienceService.executeWithCircuitBreaker(
          () => this.executionEngine.executeStep(step)
        );
        results.push(result);
      }

      const finalResult = { success: true, results };
      this.presenter.showResult(finalResult);
      return finalResult;
    } catch (error) {
      const errorResult = { success: false, error: error.message };
      this.presenter.showResult(errorResult);
      return errorResult;
    }
  }
}
```

#### 2. Command Registry Enhancement

**File**: `src/services/CommandRegistry.ts`
**Issue**: OCP violation in CommandFactory
**Time Estimate**: 2-3 hours

**Implementation**:

```typescript
// src/services/CommandRegistry.ts
export interface ICommandRegistry {
  register(definition: CommandRegistration): void;
  resolve(name: string): ICommand | null;
  getAll(): Map<string, ICommand>;
  getAliases(): Map<string, string>;
}

export interface CommandRegistration {
  name: string;
  aliases: string[];
  factory: CommandFactory;
  dependencies: string[];
}

export type CommandFactory = (container: DIContainer) => ICommand;

export class CommandRegistry implements ICommandRegistry {
  private registrations = new Map<string, CommandRegistration>();
  private aliasMap = new Map<string, string>();

  register(registration: CommandRegistration): void {
    this.registrations.set(registration.name, registration);

    // Register aliases
    for (const alias of registration.aliases) {
      this.aliasMap.set(alias, registration.name);
    }
  }

  resolve(name: string): ICommand | null {
    // Check if it's an alias
    const actualName = this.aliasMap.get(name) || name;
    const registration = this.registrations.get(actualName);

    if (!registration) {
      return null;
    }

    // Use factory to create command instance
    return registration.factory(this.container);
  }
}
```

**Enhanced CommandFactory**:

```typescript
// src/commands/CommandFactory.ts - Refactored
export class CommandFactory {
  static registerCommands(
    registry: ICommandRegistry,
    container: DIContainer
  ): void {
    // Ask Command
    registry.register({
      name: 'ask',
      aliases: ['q', 'query'],
      factory: (container) =>
        new AskCommand(
          container.resolve('aiService'),
          container.resolve('contextService'),
          container.resolve('memoryService')
        ),
      dependencies: ['aiService', 'contextService', 'memoryService'],
    });

    // Agent Command (with new architecture)
    registry.register({
      name: 'agent',
      aliases: ['a', 'agentic'],
      factory: (container) =>
        new AgentCommand(
          container.resolve('agentExecutionEngine'),
          container.resolve('agentPresenter'),
          container.resolve('resilienceService')
        ),
      dependencies: [
        'agentExecutionEngine',
        'agentPresenter',
        'resilienceService',
      ],
    });

    // Other commands...
  }
}
```

### Medium Priority (Strategic Improvements)

#### 3. Model Selection Strategy Pattern

**Files**: `src/services/AIService.ts`, `src/services/ModelSelectionService.ts`
**Issue**: OCP violation in model selection
**Time Estimate**: 3-4 hours

**Implementation**:

```typescript
// src/services/ModelSelectionService.ts
export interface IModelSelectionStrategy {
  canHandle(prompt: string, context: ContextInfo): boolean;
  selectModel(prompt: string, context: ContextInfo): AIModel;
  getPriority(): number;
}

export class CodeModelSelectionStrategy implements IModelSelectionStrategy {
  canHandle(prompt: string, context: ContextInfo): boolean {
    return (
      prompt.includes('code') ||
      prompt.includes('programming') ||
      context.projectType !== 'unknown'
    );
  }

  selectModel(prompt: string, context: ContextInfo): AIModel {
    return 'claude-3-sonnet'; // Best for code
  }

  getPriority(): number {
    return 100; // High priority for code tasks
  }
}

export class GeneralModelSelectionStrategy implements IModelSelectionStrategy {
  canHandle(prompt: string, context: ContextInfo): boolean {
    return true; // Fallback for all prompts
  }

  selectModel(prompt: string, context: ContextInfo): AIModel {
    return 'gpt-4'; // Good general model
  }

  getPriority(): number {
    return 1; // Lowest priority (fallback)
  }
}

export class ModelSelectionService {
  private strategies: IModelSelectionStrategy[] = [];

  addStrategy(strategy: IModelSelectionStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.getPriority() - a.getPriority());
  }

  selectModel(prompt: string, context: ContextInfo): AIModel {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(prompt, context)) {
        return strategy.selectModel(prompt, context);
      }
    }
    throw new Error('No model selection strategy available');
  }
}
```

**Updated AIService**:

```typescript
// src/services/AIService.ts - Updated
export class AIService implements IAIService {
  constructor(
    private configService: IConfigurationService,
    private conversationMemory: IConversationMemory,
    private modelSelectionService: ModelSelectionService // New dependency
  ) {}

  private selectModel(prompt: string, context: ContextInfo): AIModel {
    return this.modelSelectionService.selectModel(prompt, context);
  }
}
```

#### 4. Error Handling Standardization

**Files**: All service files
**Issue**: LSP violation through inconsistent error handling
**Time Estimate**: 4-5 hours

**Implementation**:

```typescript
// src/services/ErrorHandlingService.ts
export interface IErrorHandler {
  canHandle(error: Error): boolean;
  handle(error: Error, context: ErrorContext): Promise<ErrorResult>;
  getPriority(): number;
}

export interface ErrorContext {
  service: string;
  method: string;
  parameters: Record<string, unknown>;
  timestamp: Date;
}

export interface ErrorResult {
  handled: boolean;
  recovery?: () => Promise<unknown>;
  userMessage?: string;
  shouldRetry?: boolean;
}

export class NetworkErrorHandler implements IErrorHandler {
  canHandle(error: Error): boolean {
    return (
      error.name === 'NetworkError' ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('timeout')
    );
  }

  async handle(error: Error, context: ErrorContext): Promise<ErrorResult> {
    return {
      handled: true,
      shouldRetry: true,
      userMessage: 'Network connection issue. Will retry automatically.',
      recovery: async () => {
        // Wait and potentially switch to fallback endpoint
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
    };
  }

  getPriority(): number {
    return 100;
  }
}

export class ErrorHandlingService {
  private handlers: IErrorHandler[] = [];

  addHandler(handler: IErrorHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => b.getPriority() - a.getPriority());
  }

  async handleError(error: Error, context: ErrorContext): Promise<ErrorResult> {
    for (const handler of this.handlers) {
      if (handler.canHandle(error)) {
        return await handler.handle(error, context);
      }
    }

    // Default handling
    return {
      handled: false,
      userMessage: `An unexpected error occurred: ${error.message}`,
    };
  }
}
```

**Service Integration Pattern**:

```typescript
// Pattern for all services
export class ExampleService {
  constructor(
    private errorHandler: ErrorHandlingService
  ) // ... other dependencies
  {}

  async performOperation(params: unknown): Promise<Result> {
    try {
      return await this.doOperation(params);
    } catch (error) {
      const result = await this.errorHandler.handleError(error, {
        service: 'ExampleService',
        method: 'performOperation',
        parameters: { params },
        timestamp: new Date(),
      });

      if (result.recovery) {
        await result.recovery();
        return await this.doOperation(params); // Retry
      }

      throw error; // Re-throw if not handled
    }
  }
}
```

## ServiceFactory Registration Updates

Update `src/container/ServiceFactory.ts` to include new services:

```typescript
// Add to registerCoreServices method
static registerCoreServices(container: DIContainer): void {
  // ... existing registrations ...

  // Agent Execution Engine
  container.registerFactory('agentExecutionEngine', (container) => {
    const { AgentExecutionEngine } = require('../../dist/services/AgentExecutionEngine');
    const aiService = container.resolve('aiService');
    const contextService = container.resolve('contextService');
    return new AgentExecutionEngine(aiService, contextService);
  }, {
    dependencies: ['aiService', 'contextService']
  });

  // Agent Presenter
  container.registerFactory('agentPresenter', (container) => {
    const { AgentPresenter } = require('../../dist/services/AgentPresenter');
    return new AgentPresenter();
  });

  // Resilience Service
  container.registerFactory('resilienceService', (container) => {
    const { ResilienceService } = require('../../dist/services/ResilienceService');
    return new ResilienceService();
  });

  // Model Selection Service
  container.registerFactory('modelSelectionService', (container) => {
    const { ModelSelectionService, CodeModelSelectionStrategy, GeneralModelSelectionStrategy } = require('../../dist/services/ModelSelectionService');
    const service = new ModelSelectionService();
    service.addStrategy(new CodeModelSelectionStrategy());
    service.addStrategy(new GeneralModelSelectionStrategy());
    return service;
  });

  // Error Handling Service
  container.registerFactory('errorHandlingService', (container) => {
    const { ErrorHandlingService, NetworkErrorHandler } = require('../../dist/services/ErrorHandlingService');
    const service = new ErrorHandlingService();
    service.addHandler(new NetworkErrorHandler());
    return service;
  });
}
```

## Testing Requirements

Create comprehensive tests for the refactored components:

```typescript
// tests/agent-command-refactored.test.ts
describe('Refactored AgentCommand', () => {
  it('should separate concerns properly', async () => {
    const mockExecutionEngine = createMock<IAgentExecutionEngine>();
    const mockPresenter = createMock<IAgentPresenter>();
    const mockResilience = createMock<IResilienceService>();

    const command = new AgentCommand(
      mockExecutionEngine,
      mockPresenter,
      mockResilience
    );

    await command.execute({}, ['test goal'], {});

    expect(mockExecutionEngine.planExecution).toHaveBeenCalled();
    expect(mockPresenter.showPlanningPhase).toHaveBeenCalled();
    expect(mockResilience.executeWithCircuitBreaker).toHaveBeenCalled();
  });
});

// tests/command-registry.test.ts
describe('CommandRegistry', () => {
  it('should support extensible command registration', () => {
    const registry = new CommandRegistry();

    registry.register({
      name: 'test',
      aliases: ['t'],
      factory: () => new TestCommand(),
      dependencies: [],
    });

    expect(registry.resolve('test')).toBeInstanceOf(TestCommand);
    expect(registry.resolve('t')).toBeInstanceOf(TestCommand);
  });
});
```

## Implementation Timeline

### Week 1

- [ ] AgentCommand decomposition
- [ ] Create AgentExecutionEngine service
- [ ] Create AgentPresenter service
- [ ] Create ResilienceService
- [ ] Update tests

### Week 2

- [ ] Command Registry enhancement
- [ ] Update CommandFactory
- [ ] Model Selection Strategy implementation
- [ ] Integration testing

### Week 3

- [ ] Error Handling standardization
- [ ] Service integration updates
- [ ] Comprehensive testing
- [ ] Documentation updates

## Success Criteria

After implementation, the codebase should achieve:

- [ ] **SRP**: All classes have single, clear responsibilities
- [ ] **OCP**: New commands and strategies can be added without modifying existing code
- [ ] **LSP**: All implementations properly honor their contracts
- [ ] **ISP**: Interfaces remain focused and client-specific
- [ ] **DIP**: All dependencies continue to flow through abstractions

**Target SOLID Score: 93/100** (up from current 85/100)

## Risk Mitigation

1. **Backward Compatibility**: Use facade pattern during transition
2. **Testing**: Comprehensive test coverage for all refactored components
3. **Gradual Migration**: Implement changes incrementally
4. **Rollback Plan**: Keep original implementations until full validation

This refactoring will elevate the AIA codebase to exceptional SOLID compliance while maintaining its current architectural strengths.
