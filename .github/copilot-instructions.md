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

You are an AI assistant helping developers work with the AIA CLI project, a TypeScript/Node.js command-line interface for AI-powered development assistance. Focus on maintaining the service-oriented architecture, following established patterns, and leveraging the existing component structure.

## Project Overview

- **Project Name**: AIA CLI (AI Assistant Command Line Interface)
- **Type**: TypeScript/Node.js CLI Application
- **Architecture**: Service-Oriented Architecture with Dependency Injection
- **Scale**:
  - 458 Total Symbols
  - 38 Classes
  - 87 Functions
  - 312 Interfaces
- **Core Capabilities**:
  - AI-powered task execution
  - Command management
  - Memory persistence
  - Codebase analysis
  - Context awareness

## Architecture Patterns

### Service Layer

```typescript
interface ServiceName {
  // Core service interface pattern
  execute(): Promise<void>;
  configure(options: ServiceOptions): void;
}

class ComplexService implements ServiceName {
  constructor(
    private autoUpdateService: AutoUpdateService,
    private pluginManager: PluginManager
  ) {}

  async execute(): Promise<void> {
    // Implementation following SOA patterns
  }
}
```

### Dependency Injection Pattern

```typescript
class NewService {
  constructor(
    private responseEngine: ResponseAdaptationEngine,
    private workflowManager: WorkflowManager
  ) {}
}
```

## Directory Structure

```
src/
├── commands/          # CLI command implementations
├── services/          # Core services (AutoUpdateService, etc.)
├── providers/         # AI providers and integrations
├── managers/          # System managers (PluginManager, WorkflowManager)
├── engines/           # Processing engines (ResponseAdaptationEngine)
├── interfaces/        # Type definitions and interfaces
├── utils/            # Utility functions
└── index.ts          # Main entry point
```

## Key Components & Relationships

### Core Services

1. **AutoUpdateService** (14 references)

   - Primary service for system updates
   - Used by ComplexService and NewService

2. **PluginManager** (2 references)

   - Manages plugin lifecycle
   - Integrated with ComplexService

3. **ResponseAdaptationEngine** (3 references)
   - Handles AI response processing
   - Used by NewService

### Command Structure

```typescript
interface CommandDefinition {
  name: string;
  execute(context: ExecutionContext): Promise<void>;
}
```

## Code Navigation Guidelines

### Symbol Usage Patterns

- Most referenced symbols indicate core functionality:
  - `definitions` (57 usages across 13 files)
  - Type parameter `T` (129 usages across 15 files)
  - Service identifiers `a`, `b` (>120 usages each)

### Service Location

```typescript
// Service instantiation pattern
const newAIProvider = new NewAIProvider(
  container.get(AutoUpdateService),
  container.get(ResponseAdaptationEngine)
);
```

## Common Patterns

### Service Implementation

```typescript
class NewService implements ServiceName {
  constructor(
    private autoUpdate: AutoUpdateService,
    private responseEngine: ResponseAdaptationEngine
  ) {}

  async execute(): Promise<void> {
    await this.autoUpdate.check();
    await this.responseEngine.process();
  }
}
```

## Interactive Examples

### Command Execution

```typescript
// Example command usage
await cli.execute('agent', {
  task: 'analyze-code',
  context: currentContext,
});

// Memory management
await cli.execute('memory', {
  action: 'store',
  data: contextData,
});
```

## Development Workflow

1. **Service Addition**

```typescript
// 1. Define interface
interface NewFeatureService {
  execute(): Promise<void>;
}

// 2. Implement service
class NewFeatureImplementation implements NewFeatureService {
  constructor(
    private autoUpdate: AutoUpdateService,
    private pluginManager: PluginManager
  ) {}
}
```

2. **Command Integration**

```typescript
// Register new command
class NewCommand implements CommandDefinition {
  constructor(private service: NewFeatureService) {}

  async execute(context: ExecutionContext): Promise<void> {
    await this.service.execute();
  }
}
```

## Common Development Scenarios

### 1. Adding New AI Provider

```typescript
class NewAIProvider implements AIProvider {
  constructor(
    private autoUpdate: AutoUpdateService,
    private responseEngine: ResponseAdaptationEngine
  ) {}
}
```

### 2. Extending Service Functionality

```typescript
class ExtendedService extends ComplexService {
  constructor(
    autoUpdateService: AutoUpdateService,
    pluginManager: PluginManager,
    private workflowManager: WorkflowManager
  ) {
    super(autoUpdateService, pluginManager);
  }
}
```

## Performance Considerations

1. **Service Initialization**

   - Use lazy loading for heavy services
   - Leverage the AutoUpdateService for optimized updates

2. **Memory Management**
   - Follow established patterns for context handling
   - Utilize WorkflowManager for process optimization

## Guidelines

1. **Service Development**

   - Always implement corresponding interfaces
   - Use dependency injection via constructor
   - Follow AutoUpdateService pattern for updatable components

2. **Command Implementation**

   - Extend CommandDefinition interface
   - Use ResponseAdaptationEngine for AI responses
   - Integrate with PluginManager for extensibility

3. **Code Organization**
   - Place services in appropriate directories
   - Follow established naming conventions
   - Maintain consistent dependency injection pattern

```

This documentation is specifically tailored to the codebase based on the provided symbol analysis and architectural components. It provides concrete examples using actual class names and relationships from the project.
```
