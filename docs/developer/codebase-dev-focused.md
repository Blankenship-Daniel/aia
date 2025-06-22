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

# Set up development environment
npm run setup:dev

# Verify installation
npm run test
```

### First Commands
```bash
# Start in development mode
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
- Debug Extension Pack

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

### Environment Variables
```env
AIA_ENV=development
AIA_LOG_LEVEL=debug
AIA_CONFIG_PATH=./config/dev
```

## Project Structure

```
aia/
├── src/
│   ├── commands/     # CLI commands
│   ├── services/     # Core services
│   ├── interfaces/   # TypeScript interfaces
│   ├── providers/    # AI providers
│   ├── utils/        # Shared utilities
│   └── types/        # Type definitions
├── test/            # Test files
├── config/          # Configuration
└── docs/            # Documentation
```

### Key Directories
- `commands/`: Each command is a separate module
- `services/`: Service implementations
- `interfaces/`: TypeScript interface definitions
- `providers/`: AI provider implementations

## Core Development Workflows

### Adding New Features

1. Create feature branch:
```bash
git checkout -b feature/feature-name
```

2. Implement following pattern:
```typescript
// 1. Define interface
interface NewFeature {
  method(): Promise<void>;
}

// 2. Create service
@injectable()
class NewFeatureService implements NewFeature {
  constructor(
    @inject(TYPES.Dependencies) private deps: Dependencies
  ) {}
}

// 3. Add tests
describe('NewFeatureService', () => {
  // tests
});
```

### Code Review Process
1. Self-review checklist:
   - Tests passing
   - Lint clean
   - Documentation updated
   - Performance impact considered

2. PR template requirements:
   - Feature description
   - Testing approach
   - Breaking changes
   - Dependencies added

## Common Tasks

### Adding a New CLI Command

1. Create command file:
```typescript
// src/commands/new-command.ts
import { Command } from '../interfaces/command';

@injectable()
export class NewCommand implements Command {
  public static command = 'new-command';
  public static description = 'Description';

  async run(): Promise<void> {
    // Implementation
  }
}
```

2. Register in container:
```typescript
container.bind<Command>(TYPES.Command)
  .to(NewCommand)
  .inSingletonScope();
```

### Creating a New Service

```typescript
// src/services/new-service.ts
@injectable()
export class NewService implements INewService {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.Config) private config: IConfig
  ) {}

  async initialize(): Promise<void> {
    this.logger.debug('Initializing NewService');
    // Implementation
  }
}
```

## Debugging Guide

### Common Issues

1. Service Initialization Failures
```typescript
// Add debug logging
this.logger.debug({
  service: 'NewService',
  state: 'initializing',
  config: this.config
});
```

2. Memory Leaks
- Use `--inspect` flag for Node.js debugging
- Monitor heap snapshots
- Check for unsubscribed events

### Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug CLI",
  "program": "${workspaceFolder}/bin/run",
  "args": ["ask", "test query"],
  "outFiles": ["${workspaceFolder}/dist/**/*.js"]
}
```

## Testing Guidelines

### Unit Test Structure
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<Dependency>;

  beforeEach(() => {
    mockDependency = {
      method: jest.fn()
    };
    service = new ServiceName(mockDependency);
  });

  it('should handle expected behavior', async () => {
    // Arrange
    mockDependency.method.mockResolvedValue(result);
    
    // Act
    const result = await service.method();
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Mocking Strategies
```typescript
// Service mocks
const mockService = {
  method: jest.fn().mockResolvedValue(expected)
};

// AI provider mocks
const mockAIProvider = {
  generate: jest.fn().mockResolvedValue({
    content: 'mocked response'
  })
};
```

## Performance Tips

### Optimization Techniques

1. Service Caching
```typescript
@injectable()
class CachedService {
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

2. Batch Processing
```typescript
async processBatch<T>(items: T[], batchSize = 100): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(item => this.process(item)));
  }
}
```

## Troubleshooting

### Common Error Patterns

1. Service Initialization
```typescript
// Check service dependencies
if (!this.dependency) {
  throw new Error('Missing required dependency');
}
```

2. AI Provider Errors
```typescript
try {
  await this.aiProvider.generate(prompt);
} catch (error) {
  this.logger.error({
    message: 'AI provider error',
    error: error.message,
    prompt
  });
  throw new AIProviderError(error);
}
```

### When to Escalate
- Performance degradation > 20%
- Memory usage spikes
- Unhandled promise rejections
- Security vulnerabilities

## Code Contribution Guidelines

### Pull Request Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Lint passes
- [ ] Type checks pass
- [ ] Performance impact considered
- [ ] Breaking changes documented

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, test, chore

```

This developer guide provides practical, actionable information focused on daily development tasks while maintaining high code quality and performance standards. Let me know if you need any section expanded or clarified.