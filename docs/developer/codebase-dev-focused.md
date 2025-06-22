I'll create a comprehensive developer guide that's practical and focused on daily development needs.

```markdown
# AIA CLI Developer Guide

## Quick Start

### Prerequisites
- Node.js 16+ 
- TypeScript 4.8+
- Git
- VS Code (recommended)

### Initial Setup
```bash
# Clone repository
git clone [repository-url]
cd aia

# Install dependencies
npm install

# Set up development environment
npm run setup:dev

# Verify installation
npm run test
```

### First Commands
```bash
# Start development server
npm run dev

# Run CLI locally
npm run cli -- ask "How can I help?"

# Run tests
npm run test:watch
```

## Development Environment

### IDE Setup (VS Code)
Required extensions:
- ESLint
- Prettier
- TypeScript Hero
- Debug for TypeScript

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Environment Variables
Create `.env.development`:
```env
NODE_ENV=development
LOG_LEVEL=debug
AI_PROVIDER=openai
AI_API_KEY=your_key_here
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
│   └── types/          # TypeScript types
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
└── config/             # Configuration files
```

### Key Files
- `src/index.ts` - Application entry point
- `src/di-container.ts` - Dependency injection setup
- `src/config/default.ts` - Default configuration

## Core Development Workflows

### Adding New Features

1. Create feature branch:
```bash
git checkout -b feature/name
```

2. Implement using TDD:
```bash
# Create test file
touch tests/unit/feature-name.test.ts

# Create implementation
touch src/feature-name.ts

# Run tests in watch mode
npm run test:watch
```

3. Update documentation
4. Create pull request

### Code Review Process
1. Self-review checklist:
   - Tests passing
   - Lint clean
   - Documentation updated
   - Performance considered
2. Request review from team lead
3. Address feedback
4. Merge when approved

## Common Tasks

### Adding a New CLI Command

1. Create command file:
```typescript
// src/commands/new-command.ts
import { Command } from '../interfaces/command';

export class NewCommand implements Command {
  public readonly name = 'new-command';
  
  async execute(args: string[]): Promise<void> {
    // Implementation
  }
}
```

2. Register in container:
```typescript
// src/di-container.ts
container.register('NewCommand', {
  useClass: NewCommand
});
```

3. Add tests:
```typescript
// tests/unit/commands/new-command.test.ts
describe('NewCommand', () => {
  it('should execute successfully', async () => {
    // Test implementation
  });
});
```

### Creating a New Service

1. Define interface:
```typescript
// src/interfaces/new-service.interface.ts
export interface INewService {
  methodName(): Promise<void>;
}
```

2. Implement service:
```typescript
// src/services/new-service.ts
@injectable()
export class NewService implements INewService {
  constructor(
    @inject('Logger') private logger: ILogger
  ) {}

  async methodName(): Promise<void> {
    // Implementation
  }
}
```

## Debugging Guide

### Common Issues

1. AI Provider Connection:
```typescript
// Check configuration
const config = await this.configService.get('ai.provider');
this.logger.debug('AI Provider Config:', config);
```

2. Memory Management:
```typescript
// Monitor memory usage
const used = process.memoryUsage();
this.logger.debug(`Memory usage: ${used.heapUsed / 1024 / 1024} MB`);
```

### Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug CLI",
  "program": "${workspaceFolder}/dist/index.js",
  "preLaunchTask": "tsc: build",
  "outFiles": ["${workspaceFolder}/dist/**/*.js"]
}
```

## Testing Guidelines

### Unit Test Pattern
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<IDependency>;

  beforeEach(() => {
    mockDependency = {
      method: jest.fn()
    };
    service = new ServiceName(mockDependency);
  });

  it('should handle successful case', async () => {
    // Arrange
    mockDependency.method.mockResolvedValue('result');

    // Act
    const result = await service.method();

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Integration Test Pattern
```typescript
describe('Command Integration', () => {
  let container: Container;

  beforeAll(async () => {
    container = await createTestContainer();
  });

  it('should execute end-to-end flow', async () => {
    // Arrange
    const command = container.get<ICommand>('CommandName');
    
    // Act
    const result = await command.execute(['arg1', 'arg2']);

    // Assert
    expect(result).toBeDefined();
  });
});
```

## Performance Tips

### Memory Management
- Use streams for large data
- Implement cleanup in services
- Monitor memory usage

```typescript
class OptimizedService {
  private cleanup(): void {
    // Clear caches
    this.cache.clear();
    
    // Force garbage collection if needed
    if (global.gc) {
      global.gc();
    }
  }
}
```

### Async Operations
- Use Promise.all for parallel operations
- Implement proper error handling
- Consider batch processing

```typescript
async function batchProcess(items: string[]): Promise<void> {
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(item => processItem(item)));
  }
}
```

## Troubleshooting

### Common Error Patterns

1. Service Connection Errors:
```typescript
try {
  await service.connect();
} catch (error) {
  this.logger.error('Connection failed:', {
    service: service.name,
    error: error.message,
    stack: error.stack
  });
}
```

2. Configuration Issues:
```typescript
// Validate configuration
const config = await this.configService.validate();
if (!config.isValid) {
  throw new ConfigurationError('Invalid configuration', config.errors);
}
```

### When to Ask for Help
1. After checking documentation
2. After searching error logs
3. After trying common solutions
4. When stuck > 30 minutes

## Code Contribution Guidelines

### Pull Request Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Lint passes
- [ ] Branch up to date
- [ ] Performance impact considered
- [ ] Breaking changes documented

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Tests
- chore: Maintenance
```

This guide provides a practical foundation for daily development tasks while maintaining code quality and consistency. Adjust based on team feedback and evolving needs.