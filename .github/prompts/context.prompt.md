# AI Agent Context Prompt for AIA CLI Codebase

## Quick Context Loading

You are working with the **AIA (AI Assistant) CLI** codebase. To quickly understand this project, reference these context files in order:

1. **Start with**: `#file:codebase-minimal.md` - Get the essential overview
2. **Then read**: `#file:codebase-architecture.md` - Understand the structure
3. **For details**: `#file:codebase-comprehensive.md` - See complete statistics
4. **For development**: `#file:codebase-dev-focused.md` - Find key components
5. **For deep search**: `#file:codebase-index.json` - Query specific symbols

## Project Overview

- **Name**: AIA CLI (AI Assistant Command Line Interface)
- **Type**: TypeScript Node.js CLI Application
- **Architecture**: Service-Oriented Architecture with Dependency Injection
- **Scale**: 158 files, 85 classes, 56 functions
- **Main Entry**: `main.js` → `CLIApplication`

## Quick Navigation Map

### Core Components
```
src/
├── cli/CLIApplication.ts          # Entry point
├── container/                     # DI system
│   ├── DIContainer.ts            # Dependency injection
│   └── ServiceFactory.ts         # Service registration
├── commands/                      # CLI commands
│   ├── AgentCommandRefactored.ts # AI agent execution
│   ├── AskCommand.ts             # Direct AI queries
│   └── IndexCommand.ts           # Codebase indexing
├── services/                      # Core services
│   ├── AIService.ts              # AI model interactions
│   ├── MemoryService.ts          # Conversation memory
│   └── CodeIndexService.ts       # Code analysis
└── interfaces/                    # TypeScript contracts
```

## Key Search Patterns

When searching the codebase index (`#file:codebase-index.json`), use these patterns:

### Find Components
- **Classes**: Search in `"classes"` array for class definitions
- **Functions**: Search in `"functions"` array for function names
- **Files**: Search in `"files"` array for file paths
- **TODOs**: Check `"todos"` array for pending work

### Example Queries
```javascript
// Find all memory-related services
classes.filter(c => c[0].includes('Memory'))

// Find all command implementations
files.filter(f => f[0].includes('commands/'))

// Find service dependencies
files.find(f => f[0] === 'src/container/ServiceFactory.ts')
```

## Architecture Quick Reference

### Service Layer Pattern
```typescript
// 1. Interface definition
interface IMyService {
  doSomething(): Promise<void>;
}

// 2. Service implementation
class MyService implements IMyService {
  constructor(private dependency: IDependency) {}
}

// 3. Registration in ServiceFactory
container.registerFactory('myService', (c) => 
  new MyService(c.resolve('dependency'))
);
```

### Command Pattern
```typescript
// All commands follow this structure
class MyCommand implements ICommand {
  name = 'mycommand';
  description = 'Description';
  async execute(args: string[], options: any): Promise<void> {}
}
```

## Common Development Tasks

### Adding a New Command
1. Create file in `src/commands/`
2. Implement `ICommand` interface
3. Register in `CommandFactoryV2`
4. Add tests in `tests/`

### Adding a New Service
1. Define interface in `src/interfaces/`
2. Implement in `src/services/`
3. Register in `ServiceFactory`
4. Update type exports in `src/types/index.ts`

### Finding Dependencies
1. Check constructor parameters in service files
2. Look at `ServiceFactory.registerServices()` method
3. Review `DIContainer` registrations

## Memory Architecture
The project uses a composite memory system:
- `CompositeMemoryService` - Facade for all memory operations
- `ConversationMemoryService` - Chat history
- `CommandMemoryService` - Command execution history
- `MemoryPersistenceService` - Storage layer
- `MemoryCacheService` - Performance optimization

## Quick Debugging Guide

### Entry Points
- **CLI**: `main.js` → `CLIApplication.run()`
- **Commands**: Check `src/commands/` directory
- **Services**: Check `src/container/ServiceFactory.ts` for registration

### Common Issues
- **Service not found**: Check registration in `ServiceFactory`
- **Command not working**: Verify registration in `CommandFactoryV2`
- **Type errors**: Check interface definitions in `src/interfaces/`

## Performance Considerations
- Caching implemented via `MemoryCacheService`
- Performance monitoring via `PerformanceMonitorService`
- Decorators available in `src/utils/`

## Testing Structure
- Unit tests: `tests/*.test.ts`
- Integration tests: `tests/test-*.js`
- Test utilities: `tests/setup.ts`

---

**Pro Tip**: When exploring this codebase, always start with the interfaces (`src/interfaces/`) to understand contracts, then look at implementations in `src/services/` and `src/commands/`.