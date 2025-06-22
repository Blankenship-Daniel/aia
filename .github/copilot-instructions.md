I'll create a comprehensive copilot-instructions.md file specifically tailored to this codebase.

```markdown
# GitHub Copilot Instructions - AIA CLI Project

## Table of Contents
1. [Role](#role)
2. [Project Overview](#project-overview)
3. [Architecture Patterns](#architecture-patterns)
4. [Directory Structure](#directory-structure)
5. [Key Components & Relationships](#key-components--relationships)
6. [Code Navigation Guidelines](#code-navigation-guidelines)
7. [Common Patterns](#common-patterns)
8. [Interactive Examples](#interactive-examples)
9. [Development Workflow](#development-workflow)
10. [Common Development Scenarios](#common-development-scenarios)
11. [Performance Considerations](#performance-considerations)
12. [Guidelines](#guidelines)

## Role
When working with this codebase, GitHub Copilot should:
- Suggest implementations following the established Service-Oriented Architecture
- Maintain consistency with the Command Pattern implementation
- Utilize dependency injection through interfaces
- Focus on type safety and proper interface implementations
- Consider memory management implications
- Respect the plugin architecture

## Project Overview

### Project Identity
- Name: AIA CLI (AI Assistant Command Line Interface)
- Type: TypeScript Node.js CLI Application
- Purpose: AI-powered development assistance tool

### Architecture Summary
- Service-Oriented Architecture with Dependency Injection
- 158 files, 85 classes, 56 functions
- 447 total symbols across the codebase
- 315 interfaces emphasizing type safety
- 30 test files for quality assurance

### Core Capabilities
```typescript
interface CoreCapabilities {
  aiInteraction: AIProviderFactory;
  memoryManagement: MemoryManager;
  configurationHandling: ConfigurationManager;
  commandExecution: CommandFactoryV2;
  workflowOrchestration: WorkflowManager;
}
```

## Architecture Patterns

### Service-Oriented Components
```typescript
// Core service pattern
interface ServicePattern<T> {
  initialize(): Promise<void>;
  execute(context: ContextInfo): Promise<T>;
  validate(input: unknown): boolean;
}

// Example implementation
class AIService implements ServicePattern<AIResponse> {
  constructor(
    private aiProvider: AIProviderFactory,
    private memoryManager: MemoryManager
  ) {}
  // Implementation details
}
```

### Dependency Injection Pattern
```typescript
// Standard DI pattern used throughout the codebase
class CommandService {
  constructor(
    private validationService: CommandValidationService,
    private responseEngine: ResponseAdaptationEngine,
    private pluginManager: PluginManager
  ) {}
}
```

## Directory Structure
```
aia/
├── src/
│   ├── commands/          # Command implementations
│   ├── services/          # Core services
│   ├── managers/          # State management
│   ├── factories/         # Object creation
│   ├── interfaces/        # Type definitions
│   └── utils/            # Shared utilities
├── tests/                # Test suite
└── config/              # Configuration files
```

## Key Components & Relationships

### Core Services
```typescript
// Key service relationships
interface ServiceArchitecture {
  configManager: ConfigurationManager;    // 5 references
  memoryManager: MemoryManager;           // 14 references
  pluginManager: PluginManager;           // 2 references
  responseEngine: ResponseAdaptationEngine; // 3 references
  workflowManager: WorkflowManager;        // 1 reference
}
```

### Command Structure
```typescript
// Command factory pattern
class CommandFactoryV2 {
  createCommand(type: string): BaseCommand {
    // Implementation using AIProviderFactory
  }
}
```

## Code Navigation Guidelines

### Service Location
- Core services in `src/services/`
- Command implementations in `src/commands/`
- Factories in `src/factories/`

### Key File Relationships
```typescript
// Common import patterns
import { MemoryManager } from '../managers/MemoryManager';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { AIProviderFactory } from '../factories/AIProviderFactory';
```

## Common Patterns

### Command Pattern Implementation
```typescript
// Standard command structure
abstract class BaseCommand {
  constructor(
    protected memoryManager: MemoryManager,
    protected aiProvider: AIProviderFactory
  ) {}

  abstract execute(context: ContextInfo): Promise<void>;
}
```

### Factory Pattern Usage
```typescript
// AI Provider Factory pattern
class AIProviderFactory {
  createProvider(type: string): AIProvider {
    // Provider creation logic
  }
}
```

## Interactive Examples

### Command Execution
```typescript
// Example command usage
const command = new AgentCommand(
  memoryManager,
  aiProviderFactory,
  configManager
);

await command.execute({
  context: contextInfo,
  parameters: commandParams
});
```

## Development Workflow

1. Service Implementation
```typescript
// New service template
class NewService implements ServicePattern<ResultType> {
  constructor(
    private memoryManager: MemoryManager,
    private configManager: ConfigurationManager
  ) {}

  async execute(context: ContextInfo): Promise<ResultType> {
    // Implementation
  }
}
```

2. Command Addition
```typescript
// New command template
class NewCommand extends BaseCommand {
  async execute(context: ContextInfo): Promise<void> {
    const aiProvider = this.aiProvider.createProvider('gpt4');
    const memory = await this.memoryManager.getMemory();
    // Command logic
  }
}
```

## Common Development Scenarios

### Adding New AI Provider
```typescript
// Provider integration
class NewAIProvider implements AIProvider {
  constructor(private config: ConfigurationManager) {}
  
  async generate(prompt: string): Promise<string> {
    // Implementation
  }
}
```

## Performance Considerations

- Use MemoryManager for efficient state management
- Implement proper cleanup in service lifecycles
- Follow the established patterns for resource management
- Consider command execution overhead

## Guidelines

### Code Organization
- Place services in appropriate directories
- Follow established naming conventions
- Maintain interface-first approach
- Document public APIs

### Best Practices
- Use dependency injection
- Implement proper error handling
- Follow the established command pattern
- Maintain type safety
- Consider memory management
```

This documentation provides concrete guidance based on the actual codebase structure and patterns. The examples and patterns shown reflect the real architectural components and their relationships as identified in the symbol analysis.