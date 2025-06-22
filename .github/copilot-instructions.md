Here's a comprehensive copilot-instructions.md file tailored to your codebase:

```markdown
# GitHub Copilot Instructions - AIA CLI

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
You are assisting with the AIA CLI (AI Assistant Command Line Interface) project, a TypeScript/Node.js application implementing a Service-Oriented Architecture. Focus on maintaining clean architecture patterns, proper dependency injection, and optimal performance while suggesting code completions and solutions.

## Project Overview

### Core Information
- **Project Name**: AIA CLI
- **Type**: TypeScript Node.js CLI Application
- **Scale**: 458 total symbols, 38 classes, 87 functions, 312 interfaces
- **Testing Coverage**: 30 test files

### Core Capabilities
- AI-powered task execution
- Command pattern implementation
- Memory management
- Codebase analysis
- Configuration management
- Context-aware operations

## Architecture Patterns

### Service-Oriented Architecture
The project follows a strict service-oriented approach with these key services:

```typescript
interface AutoUpdateService {
    checkForUpdates(): Promise<void>;
    applyUpdate(): Promise<void>;
}

interface ResponseAdaptationEngine {
    adapt(response: AIResponse): Promise<AdaptedResponse>;
    validate(context: ExecutionContext): boolean;
}

interface PluginManager {
    loadPlugins(): Promise<void>;
    registerPlugin(plugin: Plugin): void;
}
```

### Dependency Injection Pattern
```typescript
class ComplexService {
    constructor(
        private autoUpdateService: AutoUpdateService,
        private responseEngine: ResponseAdaptationEngine,
        private workflowManager: WorkflowManager
    ) {}
}
```

## Directory Structure
```
src/
├── commands/          # CLI commands
├── services/          # Core services
├── providers/         # AI providers
├── adapters/         # Response adapters
├── workflows/        # Workflow definitions
├── plugins/          # Plugin system
└── utils/            # Shared utilities
```

## Key Components & Relationships

### Core Services
```typescript
// Most referenced service
class AutoUpdateService implements IAutoUpdateService {
    // 14 references across 2 files
    async checkForUpdates(): Promise<void> {
        // Implementation
    }
}

class ResponseAdaptationEngine {
    // 3 references in codebase
    adapt(response: AIResponse): Promise<AdaptedResponse> {
        // Implementation
    }
}
```

### Service Relationships
```typescript
class WorkflowManager {
    constructor(
        private pluginManager: PluginManager,
        private responseEngine: ResponseAdaptationEngine
    ) {}
}
```

## Code Navigation Guidelines

### Service Location Patterns
- Services are defined in `src/services/{ServiceName}.ts`
- Implementations follow the pattern: `{ServiceName}Impl.ts`
- Interfaces are in `src/interfaces/{ServiceName}.interface.ts`

### Common Symbol References
Based on symbol analysis:
- `definitions` (57 usages across 13 files) - Used for service and command definitions
- Type parameter `T` (129 usages) - Generic type implementations
- Interface implementations (312 total) - Strong typing throughout

## Common Patterns

### Service Registration
```typescript
class NewService implements ServiceName {
    constructor(
        private dependencies: Dependencies
    ) {}
}

class NewAIProvider implements AIProvider {
    // Implementation
}
```

### Command Pattern Implementation
```typescript
interface Command {
    execute(context: ExecutionContext): Promise<void>;
}

class AgentCommand implements Command {
    constructor(
        private autoUpdateService: AutoUpdateService,
        private workflowManager: WorkflowManager
    ) {}
}
```

## Interactive Examples

### Command Execution
```typescript
// Using the command pattern
const command = new AgentCommand(autoUpdateService, workflowManager);
await command.execute({
    context: executionContext,
    parameters: commandParameters
});
```

### Service Integration
```typescript
const responseEngine = new ResponseAdaptationEngine();
const pluginManager = new PluginManager();
const workflowManager = new WorkflowManager(pluginManager, responseEngine);
```

## Development Workflow

1. **Service Implementation**
```typescript
interface NewFeatureService {
    process(): Promise<void>;
}

class NewFeatureServiceImpl implements NewFeatureService {
    constructor(
        private autoUpdateService: AutoUpdateService,
        private responseEngine: ResponseAdaptationEngine
    ) {}
}
```

2. **Command Addition**
```typescript
class NewCommand implements Command {
    constructor(
        private newFeatureService: NewFeatureService
    ) {}

    async execute(context: ExecutionContext): Promise<void> {
        // Implementation
    }
}
```

## Common Development Scenarios

### Adding a New Service
```typescript
// 1. Define interface
interface NewService {
    operation(): Promise<void>;
}

// 2. Implement service
class NewServiceImpl implements NewService {
    constructor(
        private dependencyA: ServiceName,
        private dependencyB: ComplexService
    ) {}
}
```

### Extending Plugin System
```typescript
class CustomPlugin implements Plugin {
    constructor(
        private pluginManager: PluginManager
    ) {}

    register(): void {
        // Registration logic
    }
}
```

## Performance Considerations

1. **Service Instantiation**
- Use singleton pattern for heavy services
- Implement lazy loading where appropriate
- Consider memory usage in the ResponseAdaptationEngine

2. **Command Execution**
- Implement caching in the AutoUpdateService
- Optimize WorkflowManager execution paths

## Guidelines

### Code Organization
1. Follow the established service pattern:
```typescript
interface IService {
    // Interface definition
}

class ServiceImpl implements IService {
    // Implementation
}
```

### Dependency Injection
1. Always use constructor injection:
```typescript
class NewFeature {
    constructor(
        private autoUpdateService: AutoUpdateService,
        private workflowManager: WorkflowManager
    ) {}
}
```

### Error Handling
```typescript
try {
    await this.autoUpdateService.checkForUpdates();
} catch (error) {
    // Structured error handling
}
```
```

This documentation provides specific, actionable guidance based on your actual codebase structure and symbols. It uses real component names and relationships from your symbol analysis to create concrete examples and patterns.