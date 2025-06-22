I'll create a comprehensive developer guide that's practical and focused on daily development needs.

```markdown
# AIA CLI Developer Guide

## Quick Start

### Prerequisites
- Node.js 16+
- TypeScript 4.8+
- VS Code (recommended)
- Git

### Initial Setup
```bash
# Clone repository
git clone [repository-url]
cd aia

# Install dependencies
npm install

# Set up environment
cp .env.example .env
npm run setup

# Verify installation
npm run test
```

### First Commands
```bash
# Start in development mode
npm run dev

# Run CLI locally
./bin/aia ask "How do I add a new command?"
```

## Development Environment

### IDE Setup (VS Code)
Required extensions:
- ESLint
- Prettier
- TypeScript IDE Support
- Debug for Node.js

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### Debug Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/src/index.ts",
      "args": ["ask", "test query"],
      "preLaunchTask": "tsc: build"
    }
  ]
}
```

## Project Structure

```
aia/
├── src/
│   ├── commands/          # CLI commands
│   ├── services/          # Core services
│   ├── factories/         # Factory implementations
│   ├── interfaces/        # TypeScript interfaces
│   ├── managers/          # System managers
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript type definitions
├── tests/                # Test files
├── config/               # Configuration files
└── docs/                # Documentation
```

### Key Files
- `src/index.ts` - Application entry point
- `src/di-container.ts` - Dependency injection setup
- `src/config/default.ts` - Default configuration

## Core Development Workflows

### Adding New Features

1. Create feature branch:
```bash
git checkout -b feature/new-feature-name
```

2. Implement following pattern:
   - Interface definition
   - Service implementation
   - Factory registration
   - Command integration
   - Tests

3. Update documentation

### Code Review Process
1. Self-review checklist:
   - Tests passing
   - Lint checks clean
   - Documentation updated
   - Performance impact considered
   
2. Create pull request with:
   - Feature description
   - Testing steps
   - Breaking changes
   - Performance implications

## Common Tasks

### Adding a New CLI Command

1. Create command class:
```typescript
// src/commands/NewCommand.ts
import { BaseCommand } from './BaseCommand';

export class NewCommand extends BaseCommand {
  public static command = 'new-command';
  public static description = 'Description';

  async execute(): Promise<void> {
    // Implementation
  }
}
```

2. Register in factory:
```typescript
// src/factories/CommandFactoryV2.ts
import { NewCommand } from '../commands/NewCommand';

registerCommand(NewCommand.command, () => new NewCommand());
```

### Creating a New Service

1. Define interface:
```typescript
// src/interfaces/INewService.ts
export interface INewService {
  methodName(): Promise<void>;
}
```

2. Implement service:
```typescript
// src/services/NewService.ts
@injectable()
export class NewService implements INewService {
  constructor(
    @inject(TYPES.Dependencies) private deps: IDependencies
  ) {}

  async methodName(): Promise<void> {
    // Implementation
  }
}
```

3. Register in DI container:
```typescript
// src/di-container.ts
container.bind<INewService>(TYPES.NewService).to(NewService);
```

## Testing Guidelines

### Unit Testing Pattern
```typescript
// tests/unit/NewService.test.ts
describe('NewService', () => {
  let service: NewService;
  let mockDeps: jest.Mocked<IDependencies>;

  beforeEach(() => {
    mockDeps = {
      dependency: jest.fn()
    };
    service = new NewService(mockDeps);
  });

  it('should perform expected action', async () => {
    // Arrange
    mockDeps.dependency.mockResolvedValue('result');

    // Act
    await service.methodName();

    // Assert
    expect(mockDeps.dependency).toHaveBeenCalled();
  });
});
```

## Performance Tips

### Memory Management
- Use `MemoryManager` for conversation state
- Implement cleanup in service destructors
- Monitor memory usage with `process.memoryUsage()`

### Optimization Techniques
1. Lazy loading for heavy services
2. Caching frequently used data
3. Batch operations where possible
4. Use streams for large data processing

## Troubleshooting

### Common Issues

1. Configuration errors:
```bash
# Verify config
./bin/aia config show

# Reset to defaults
./bin/aia config reset
```

2. Memory issues:
```bash
# Clear memory
./bin/aia memory clear

# View memory usage
./bin/aia memory status
```

3. Context problems:
```bash
# Reset context
./bin/aia context reset

# Verify context
./bin/aia context show
```

### Getting Help
1. Check existing issues
2. Run diagnostics: `./bin/aia doctor`
3. Create issue with:
   - Command output
   - Error message
   - Environment details
   - Steps to reproduce

## Code Style Guide

### TypeScript Best Practices
- Use strict type checking
- Prefer interfaces over types
- Implement error handling
- Document public APIs

### Naming Conventions
- PascalCase for classes
- camelCase for methods
- UPPER_CASE for constants
- I-prefix for interfaces

### Error Handling
```typescript
try {
  await riskyOperation();
} catch (error) {
  this.logger.error('Operation failed', {
    error,
    context: this.contextInfo
  });
  throw new OperationalError('Failed to process', error);
}
```

Remember to maintain this guide as the project evolves.
```

This guide provides practical, day-to-day development information while maintaining a focus on the specific architecture and patterns used in the AIA CLI project. It's structured to help developers get started quickly and find solutions to common tasks efficiently.