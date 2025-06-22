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
# Clone and install
git clone [repository-url]
cd aia
npm install

# Set up environment
cp .env.example .env
npm run setup

# Verify installation
npm run test
npm run build
```

### First Commands
```bash
# Start development server
npm run dev

# Run CLI locally
./bin/run ask "How can I help?"
```

## Development Environment

### IDE Setup (VS Code)
Required extensions:
- ESLint
- Prettier
- TypeScript Hero
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
│   ├── commands/        # CLI commands
│   ├── services/        # Core services
│   ├── interfaces/      # TypeScript interfaces
│   ├── providers/       # AI providers
│   ├── utils/          # Shared utilities
│   └── types/          # Type definitions
├── tests/              # Test files
├── config/             # Configuration
└── docs/              # Documentation
```

### Key Directories
- `commands/`: Each CLI command as separate module
- `services/`: Core service implementations
- `interfaces/`: TypeScript interface definitions
- `providers/`: AI provider implementations
- `utils/`: Shared utility functions

## Core Development Workflows

### Adding New Features

1. Create feature branch:
```bash
git checkout -b feature/new-feature-name
```

2. Implement changes following TDD:
```bash
# Create test first
touch tests/services/NewFeature.test.ts
# Implement feature
touch src/services/NewFeature.ts
```

3. Test and lint:
```bash
npm run test
npm run lint
```

### Code Review Process
1. Self-review checklist:
   - Tests passing
   - Lint clean
   - Documentation updated
   - Performance considered
   
2. Create PR with template:
   - Feature description
   - Testing approach
   - Breaking changes
   - Performance impact

## Common Tasks

### Adding a New CLI Command

1. Create command file:
```typescript
// src/commands/newCommand.ts
import { Command } from '../interfaces/Command';

export class NewCommand implements Command {
  public static description = 'Command description';
  
  public async run(): Promise<void> {
    // Implementation
  }
}
```

2. Register in command index:
```typescript
// src/commands/index.ts
export { NewCommand } from './newCommand';
```

### Creating a New Service

1. Define interface:
```typescript
// src/interfaces/INewService.ts
export interface INewService {
  execute(): Promise<void>;
}
```

2. Implement service:
```typescript
// src/services/NewService.ts
import { injectable } from 'inversify';
import { INewService } from '../interfaces/INewService';

@injectable()
export class NewService implements INewService {
  public async execute(): Promise<void> {
    // Implementation
  }
}
```

3. Register in container:
```typescript
// src/container.ts
container.bind<INewService>('NewService').to(NewService);
```

## Testing Guidelines

### Unit Testing Pattern
```typescript
describe('NewService', () => {
  let service: NewService;
  let mockDependency: jest.Mocked<IDependency>;

  beforeEach(() => {
    mockDependency = {
      method: jest.fn()
    };
    service = new NewService(mockDependency);
  });

  it('should execute successfully', async () => {
    await expect(service.execute()).resolves.not.toThrow();
  });
});
```

### Mocking Strategy
```typescript
// Create mock implementation
const mockAIProvider: jest.Mocked<IAIProvider> = {
  query: jest.fn().mockResolvedValue('response'),
  initialize: jest.fn().mockResolvedValue(undefined)
};

// Verify interactions
expect(mockAIProvider.query).toHaveBeenCalledWith('test query');
```

## Performance Tips

### Optimization Techniques
1. Lazy loading:
```typescript
const service = await import('./services/HeavyService');
```

2. Caching:
```typescript
@injectable()
class CacheableService {
  private cache = new Map<string, any>();
  
  async getData(key: string): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const data = await this.fetchData(key);
    this.cache.set(key, data);
    return data;
  }
}
```

3. Memory management:
```typescript
class MemoryEfficientService {
  private cleanup(): void {
    // Clear temporary data
    this.tempData = null;
    global.gc && global.gc();
  }
}
```

## Troubleshooting

### Common Issues

1. Dependency Injection Errors
```
Error: No matching bindings found for serviceIdentifier: Symbol(IService)
```
Solution: Check container registration in `src/container.ts`

2. Type Errors
```
TS2339: Property 'x' does not exist on type 'Y'
```
Solution: Implement missing interface members or check type definitions

3. Memory Leaks
- Use Chrome DevTools Memory Profiler
- Check for unsubscribed observables
- Monitor heap usage with `process.memoryUsage()`

### When to Ask for Help
1. After checking:
   - Documentation
   - Existing issues
   - Debug logs
   - Stack trace
2. Provide:
   - Steps to reproduce
   - Environment details
   - Relevant logs
   - Attempted solutions

## Code Contribution Guidelines

### Pull Request Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Lint passes
- [ ] Branch up-to-date
- [ ] Performance impact considered
- [ ] Breaking changes documented

### Commit Message Format
```
type(scope): summary

Description
```
Types: feat, fix, docs, style, refactor, test, chore

### Code Style
- Follow existing patterns
- Use TypeScript features appropriately
- Document public APIs
- Keep functions focused and small
```

This guide should give developers a solid foundation for working with the codebase while focusing on practical, day-to-day development needs.