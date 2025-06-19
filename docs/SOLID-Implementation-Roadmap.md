# SOLID Implementation Roadmap - Ready to Execute

## Immediate Actions (Can Start Today)

### 🔥 CRITICAL PRIORITY - Week 1

#### Day 1: Fix CommandFactory OCP Violation

**Goal**: Eliminate switch statement, enable extensible command creation

**Files to Create**:

1. `src/interfaces/ICommandRegistrar.ts`
2. `src/services/CommandRegistrar.ts`
3. `src/commands/CommandFactoryV2.ts`

**Files to Modify**:

1. `src/container/ServiceFactory.ts` - Update DI registration
2. `src/cli/CLIApplication.ts` - Use new factory

**Validation**: New commands can be added without modifying existing code

```bash
# Test command (after implementation)
cd /Users/d0b01r1/Documents/code/aia
npm test -- --grep "CommandFactory"
```

#### Day 2-3: Split MemoryService - Create Interfaces

**Goal**: Define focused interfaces for memory operations

**Files to Create**:

```
src/interfaces/memory/
├── IMemoryPersistence.ts
├── IMemorySearch.ts
├── IMemoryStatistics.ts
├── IMemoryIndex.ts
├── IMemoryTransfer.ts
├── IMemoryConversations.ts
└── IMemoryCommands.ts
```

**Validation**: All interfaces compile and have proper type definitions

```bash
# Test compilation
npx tsc --noEmit
```

#### Day 4-5: Implement Memory Persistence Service

**Goal**: Extract file I/O operations from MemoryService

**Files to Create**:

1. `src/services/memory/MemoryPersistenceService.ts`
2. `tests/services/memory/MemoryPersistenceService.test.ts`

**Files to Modify**:

1. `src/container/ServiceFactory.ts` - Register new service

**Validation**: Persistence service handles all file operations independently

```bash
# Test persistence
npm test -- --grep "MemoryPersistence"
```

### 📋 HIGH PRIORITY - Week 2

#### Day 6-7: Implement Memory Search Service

**Goal**: Extract search operations from MemoryService

**Files to Create**:

1. `src/services/memory/MemorySearchService.ts`
2. `src/services/memory/MemoryIndexService.ts`
3. `tests/services/memory/MemorySearchService.test.ts`

**Validation**: Search operations work independently with proper relevance scoring

#### Day 8-9: Implement Memory Statistics & Transfer Services

**Goal**: Extract statistics and import/export operations

**Files to Create**:

1. `src/services/memory/MemoryStatisticsService.ts`
2. `src/services/memory/MemoryTransferService.ts`
3. Corresponding test files

**Validation**: Statistics and transfer operations work independently

#### Day 10: Create Memory Facade Service

**Goal**: Compose all memory services into unified interface

**Files to Create**:

1. `src/services/memory/MemoryServiceV2.ts`
2. `tests/services/memory/MemoryServiceV2.test.ts`

**Validation**: Facade maintains all existing functionality while delegating to focused services

### ⚡ MEDIUM PRIORITY - Week 3

#### Day 11-12: Split CommandService Responsibilities

**Goal**: Separate command execution, validation, and optimization

**Files to Create**:

```
src/services/command/
├── ProcessExecutor.ts
├── CommandValidator.ts
├── CommandOptimizer.ts
└── CommandServiceV2.ts
```

#### Day 13: Update Dependency Injection Configuration

**Goal**: Wire all new services through DI container

**Files to Modify**:

1. `src/container/ServiceFactory.ts` - Complete service registration
2. Update all consumers to use new services

#### Day 14: Integration Testing & Documentation

**Goal**: Ensure all refactored components work together

**Tasks**:

1. Run full test suite
2. Update README with new architecture
3. Create migration guide

---

## Specific Implementation Steps

### Step 1: CommandFactory Refactoring (Day 1)

**1.1 Create ICommandRegistrar Interface**

```bash
touch src/interfaces/ICommandRegistrar.ts
```

**Content**:

```typescript
export interface ICommandRegistrar {
  register(name: string, aliases: string[], factory: () => ICommand): void;
  create(name: string): ICommand | null;
  getAllCommands(): Map<string, ICommand>;
  getAliases(): Map<string, string>;
}
```

**1.2 Implement CommandRegistrar**

```bash
touch src/services/CommandRegistrar.ts
```

**1.3 Create CommandFactoryV2**

```bash
touch src/commands/CommandFactoryV2.ts
```

**1.4 Update ServiceFactory**

```typescript
// In src/container/ServiceFactory.ts
// Add new registrations
container.registerFactory('commandRegistrar', () => new CommandRegistrar());
container.registerFactory('commandFactory', (container) => {
  const services = {
    aiService: container.resolve('ai'),
    memoryService: container.resolve('memory'),
    contextService: container.resolve('context'),
    commandService: container.resolve('command'),
    configurationService: container.resolve('configuration'),
  };
  return new CommandFactoryV2(services);
});
```

**1.5 Test Implementation**

```bash
npm test -- --grep "CommandFactory"
```

### Step 2: Memory Interface Creation (Day 2-3)

**2.1 Create Interface Directory**

```bash
mkdir -p src/interfaces/memory
```

**2.2 Create Each Interface File**

```bash
# Create all interface files
for interface in IMemoryPersistence IMemorySearch IMemoryStatistics IMemoryIndex IMemoryTransfer IMemoryConversations IMemoryCommands; do
  touch "src/interfaces/memory/${interface}.ts"
done
```

**2.3 Validate Compilation**

```bash
npx tsc --noEmit
```

### Step 3: Memory Service Implementation (Day 4-10)

**3.1 Create Service Directory**

```bash
mkdir -p src/services/memory
mkdir -p tests/services/memory
```

**3.2 Implement Each Service**

```bash
# Create service files
for service in MemoryPersistenceService MemorySearchService MemoryIndexService MemoryStatisticsService MemoryTransferService MemoryConversationsService MemoryCommandsService MemoryServiceV2; do
  touch "src/services/memory/${service}.ts"
  touch "tests/services/memory/${service}.test.ts"
done
```

**3.3 Progressive Implementation**

- Day 4-5: MemoryPersistenceService + tests
- Day 6-7: MemorySearchService + MemoryIndexService + tests
- Day 8-9: MemoryStatisticsService + MemoryTransferService + tests
- Day 10: MemoryServiceV2 (facade) + integration tests

---

## Testing Strategy

### Unit Tests for Each Service

```typescript
// Example: tests/services/memory/MemoryPersistenceService.test.ts
describe('MemoryPersistenceService', () => {
  let service: MemoryPersistenceService;
  let mockConfig: IConfigurationService;

  beforeEach(() => {
    mockConfig = createMockConfigurationService();
    service = new MemoryPersistenceService(mockConfig);
  });

  it('should load default memory when file does not exist', async () => {
    const memory = await service.load();
    expect(memory.conversations).toEqual([]);
    expect(memory.commands).toEqual([]);
  });

  it('should save and load memory correctly', async () => {
    const testData = createTestMemoryData();
    await service.save(testData);

    const loaded = await service.load();
    expect(loaded).toEqual(testData);
  });
});
```

### Integration Tests

```typescript
// tests/integration/MemoryServiceV2.integration.test.ts
describe('MemoryServiceV2 Integration', () => {
  it('should maintain backward compatibility', async () => {
    // Test that new service works exactly like old one
    const oldService = new MemoryService(mockConfig);
    const newService = container.resolve<MemoryServiceV2>('memory');

    // Same operations should produce same results
    await newService.addConversation('test', 'response', context);
    await oldService.addConversation('test', 'response', context);

    const newStats = await newService.getStats();
    const oldStats = await oldService.getStats();

    expect(newStats).toEqual(oldStats);
  });
});
```

---

## Success Criteria

### Week 1 Success Metrics

- [ ] CommandFactory switch statement eliminated ✅
- [ ] New commands can be added without core modifications ✅
- [ ] All memory interfaces defined and compile ✅
- [ ] MemoryPersistenceService implemented and tested ✅
- [ ] No breaking changes to existing functionality ✅

### Week 2 Success Metrics

- [ ] All 6 memory services implemented and tested ✅
- [ ] Memory operations 50% faster due to focused services ✅
- [ ] Test coverage increased to 85%+ ✅
- [ ] MemoryServiceV2 facade maintains full compatibility ✅

### Week 3 Success Metrics

- [ ] CommandService responsibilities separated ✅
- [ ] All services wired through DI container ✅
- [ ] Complete integration test suite passing ✅
- [ ] Architecture documentation updated ✅
- [ ] Performance improved by 30% ✅

### Final SOLID Compliance

- ✅ **SRP**: No class >200 lines, single responsibility
- ✅ **OCP**: New features added without modifying existing code
- ✅ **LSP**: All implementations substitutable through interfaces
- ✅ **ISP**: No interface >10 methods, focused contracts
- ✅ **DIP**: All dependencies through interfaces, proper abstraction

---

## Risk Mitigation

### Rollback Strategy

```typescript
// Maintain backward compatibility during transition
export class MemoryServiceAdapter implements IMemoryService {
  constructor(
    private useNewImplementation: boolean,
    private oldService: MemoryService,
    private newService: MemoryServiceV2
  ) {}

  async loadMemory(): Promise<MemoryData> {
    return this.useNewImplementation
      ? this.newService.loadMemory()
      : this.oldService.loadMemory();
  }

  // ... other methods with same pattern
}
```

### Feature Flags

```typescript
// src/config/FeatureFlags.ts
export const FeatureFlags = {
  USE_NEW_COMMAND_FACTORY: process.env.AIA_NEW_COMMAND_FACTORY === 'true',
  USE_NEW_MEMORY_SERVICE: process.env.AIA_NEW_MEMORY_SERVICE === 'true',
  USE_SPLIT_COMMAND_SERVICE: process.env.AIA_SPLIT_COMMAND_SERVICE === 'true',
};
```

### Gradual Migration

1. **Week 1**: Implement alongside existing (no replacement)
2. **Week 2**: Enable via feature flags for testing
3. **Week 3**: Default to new implementation
4. **Week 4**: Remove old implementation

---

## Getting Started

### Prerequisites

```bash
# Ensure TypeScript is configured
npx tsc --init

# Install development dependencies
npm install --save-dev @types/node @types/jest

# Run existing tests to establish baseline
npm test
```

### Start Implementation

```bash
# Create the first interface
touch src/interfaces/ICommandRegistrar.ts

# Copy the interface content from Template 1
# Begin implementation...
```

**Next Step**: Begin with CommandFactory refactoring (Day 1) as it has the highest impact and lowest risk.

This roadmap provides concrete, actionable steps that can be executed immediately to improve your codebase's SOLID compliance while maintaining full functionality.
