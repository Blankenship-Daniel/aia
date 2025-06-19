# SOLID Refactoring Implementation Templates

## Template 1: Command Registry Pattern (Fixing OCP Violation)

### Current Problem: Switch Statement in CommandFactory

The current `CommandFactory.createCommand()` method uses a switch statement that violates the Open/Closed Principle.

### Solution: Registry-Based Command Creation

#### Step 1: Create Command Registration Interface

```typescript
// src/interfaces/ICommandRegistrar.ts
export interface ICommandRegistrar {
  register(name: string, aliases: string[], factory: () => ICommand): void;
  create(name: string): ICommand | null;
  getAllCommands(): Map<string, ICommand>;
  getAliases(): Map<string, string>;
}
```

#### Step 2: Implement Command Registrar

```typescript
// src/services/CommandRegistrar.ts
import { ICommandRegistrar } from '../interfaces/ICommandRegistrar';
import { ICommand } from '../interfaces/ICommand';

export class CommandRegistrar implements ICommandRegistrar {
  private factories = new Map<string, () => ICommand>();
  private aliases = new Map<string, string>();

  register(name: string, aliases: string[], factory: () => ICommand): void {
    // Register main command
    this.factories.set(name.toLowerCase(), factory);

    // Register all aliases
    aliases.forEach((alias) => {
      this.aliases.set(alias.toLowerCase(), name.toLowerCase());
    });
  }

  create(name: string): ICommand | null {
    const normalizedName = name.toLowerCase();

    // Check if it's an alias first
    const mainCommand = this.aliases.get(normalizedName);
    const commandName = mainCommand || normalizedName;

    // Get and execute factory
    const factory = this.factories.get(commandName);
    return factory ? factory() : null;
  }

  getAllCommands(): Map<string, ICommand> {
    const commands = new Map<string, ICommand>();

    for (const [name, factory] of this.factories) {
      commands.set(name, factory());
    }

    return commands;
  }

  getAliases(): Map<string, string> {
    return new Map(this.aliases);
  }
}
```

#### Step 3: Refactor CommandFactory

```typescript
// src/commands/CommandFactoryV2.ts
import { ICommand } from '../interfaces/ICommand';
import { ICommandRegistrar } from '../interfaces/ICommandRegistrar';
import { CommandRegistrar } from '../services/CommandRegistrar';
import { ServiceContainer } from '../types/ServiceContainer';

export class CommandFactoryV2 {
  private registrar: ICommandRegistrar;

  constructor(private services: ServiceContainer) {
    this.registrar = new CommandRegistrar();
    this.setupCommands();
  }

  private setupCommands(): void {
    // Ask Command
    this.registrar.register(
      'ask',
      ['q', 'query'],
      () =>
        new AskCommand(
          this.services.aiService,
          this.services.contextService,
          this.services.memoryService
        )
    );

    // Execute Command
    this.registrar.register(
      'exec',
      ['x', 'execute'],
      () =>
        new ExecuteCommand(
          this.services.commandService,
          this.services.contextService,
          this.services.memoryService
        )
    );

    // Agent Command
    this.registrar.register(
      'agent',
      ['a', 'agentic'],
      () =>
        new AgentCommand(
          this.services.aiService,
          this.services.contextService,
          this.services.commandService,
          this.services.memoryService
        )
    );

    // Config Command
    this.registrar.register(
      'config',
      ['cfg', 'configure'],
      () => new ConfigCommand(this.services.configurationService)
    );

    // Memory Command
    this.registrar.register(
      'memory',
      ['mem', 'stats'],
      () => new MemoryCommand(this.services.memoryService)
    );

    // Context Command
    this.registrar.register(
      'context',
      ['ctx', 'info'],
      () => new ContextCommand(this.services.contextService)
    );

    // Index Command
    this.registrar.register(
      'index',
      ['idx', 'build'],
      () => new IndexCommand()
    );
  }

  // Now adding new commands requires NO modification to existing code
  public addCommand(
    name: string,
    aliases: string[],
    factory: () => ICommand
  ): void {
    this.registrar.register(name, aliases, factory);
  }

  public createCommand(name: string): ICommand | null {
    return this.registrar.create(name);
  }

  public getAllCommands(): Map<string, ICommand> {
    return this.registrar.getAllCommands();
  }
}
```

#### Step 4: Plugin-based Command Registration

```typescript
// src/interfaces/ICommandPlugin.ts
export interface ICommandPlugin {
  getName(): string;
  getVersion(): string;
  register(registrar: ICommandRegistrar, services: ServiceContainer): void;
}

// Example plugin
export class CustomCommandPlugin implements ICommandPlugin {
  getName(): string {
    return 'custom-commands';
  }

  getVersion(): string {
    return '1.0.0';
  }

  register(registrar: ICommandRegistrar, services: ServiceContainer): void {
    // Add new commands without modifying core
    registrar.register(
      'analyze',
      ['analyze', 'a'],
      () => new AnalyzeCommand(services.aiService, services.contextService)
    );

    registrar.register(
      'deploy',
      ['d'],
      () => new DeployCommand(services.commandService, services.contextService)
    );
  }
}
```

---

## Template 2: Memory Service Decomposition (Fixing SRP Violation)

### Current Problem: MemoryService God Class

The current `MemoryService` handles 6 different responsibilities in 700+ lines.

### Solution: Focused Service Decomposition

#### Step 1: Define Focused Interfaces

```typescript
// src/interfaces/memory/IMemoryPersistence.ts
export interface IMemoryPersistence {
  load(): Promise<MemoryData>;
  save(data: MemoryData): Promise<void>;
  clear(): Promise<void>;
  getPath(): string;
}

// src/interfaces/memory/IMemorySearch.ts
export interface IMemorySearch {
  searchConversations(query: string, limit?: number): Promise<MemoryEntry[]>;
  searchCommands(query: string, limit?: number): Promise<CommandHistoryEntry[]>;
  searchAll(
    query: string,
    type?: SearchType,
    limit?: number
  ): Promise<SearchResult[]>;
  calculateRelevance(query: string, content: string): number;
}

// src/interfaces/memory/IMemoryStatistics.ts
export interface IMemoryStatistics {
  getStats(data: MemoryData): Promise<MemoryStats>;
  getUsageMetrics(data: MemoryData): Promise<UsageMetrics>;
  getStorageInfo(): Promise<StorageInfo>;
}

// src/interfaces/memory/IMemoryIndex.ts
export interface IMemoryIndex {
  buildIndex(data: MemoryData): Promise<SemanticIndex>;
  updateIndex(index: SemanticIndex, entry: MemoryEntry): Promise<SemanticIndex>;
  searchIndex(index: SemanticIndex, query: string): SearchMatch[];
  getIndexSize(index: SemanticIndex): number;
}

// src/interfaces/memory/IMemoryTransfer.ts
export interface IMemoryTransfer {
  exportMemory(data: MemoryData, path: string): Promise<void>;
  importMemory(filePath: string): Promise<MemoryData>;
  validateImport(data: unknown): boolean;
  compressMemory(data: MemoryData, maxAge: number): Promise<MemoryData>;
}

// src/interfaces/memory/IMemoryConversations.ts
export interface IMemoryConversations {
  addConversation(
    data: MemoryData,
    query: string,
    response: string,
    context: ContextInfo,
    model?: AIModel
  ): Promise<MemoryData>;
  getRecentConversations(data: MemoryData, limit?: number): MemoryEntry[];
  searchConversations(
    data: MemoryData,
    query: string,
    limit?: number
  ): MemoryEntry[];
}

// src/interfaces/memory/IMemoryCommands.ts
export interface IMemoryCommands {
  addCommand(
    data: MemoryData,
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ): Promise<MemoryData>;
  getRecentCommands(data: MemoryData, limit?: number): CommandHistoryEntry[];
  searchCommands(
    data: MemoryData,
    query: string,
    limit?: number
  ): CommandHistoryEntry[];
}
```

#### Step 2: Implement Focused Services

```typescript
// src/services/memory/MemoryPersistenceService.ts
import { IMemoryPersistence } from '../../interfaces/memory/IMemoryPersistence';
import { IConfigurationService } from '../../interfaces/IConfigurationService';

export class MemoryPersistenceService implements IMemoryPersistence {
  private memoryPath: string;

  constructor(private configService: IConfigurationService) {
    this.memoryPath = path.join(os.homedir(), '.aia', 'memory.json');
  }

  async load(): Promise<MemoryData> {
    try {
      if (await fs.pathExists(this.memoryPath)) {
        return await fs.readJson(this.memoryPath);
      }
      return this.getDefaultMemory();
    } catch (error) {
      console.warn('Failed to load memory:', error);
      return this.getDefaultMemory();
    }
  }

  async save(data: MemoryData): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.memoryPath));
      await fs.writeJson(this.memoryPath, data, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save memory: ${error.message}`);
    }
  }

  async clear(): Promise<void> {
    const defaultData = this.getDefaultMemory();
    await this.save(defaultData);
  }

  getPath(): string {
    return this.memoryPath;
  }

  private getDefaultMemory(): MemoryData {
    return {
      conversations: [],
      commands: [],
      preferences: {},
      workingDirectories: {},
      semanticIndex: {},
      agenticHistory: [],
    };
  }
}

// src/services/memory/MemorySearchService.ts
import { IMemorySearch } from '../../interfaces/memory/IMemorySearch';
import { IMemoryIndex } from '../../interfaces/memory/IMemoryIndex';

export class MemorySearchService implements IMemorySearch {
  constructor(private indexService: IMemoryIndex) {}

  async searchConversations(query: string, limit = 10): Promise<MemoryEntry[]> {
    // Implementation focused only on conversation search
    const queryWords = this.tokenize(query.toLowerCase());
    const results: Array<{ entry: MemoryEntry; score: number }> = [];

    // Search algorithm implementation
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((result) => result.entry);
  }

  async searchCommands(
    query: string,
    limit = 10
  ): Promise<CommandHistoryEntry[]> {
    // Implementation focused only on command search
    const queryLower = query.toLowerCase();
    const results: Array<{ entry: CommandHistoryEntry; score: number }> = [];

    // Search algorithm implementation
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((result) => result.entry);
  }

  async searchAll(
    query: string,
    type?: SearchType,
    limit = 10
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    if (!type || type === 'conversation') {
      const conversations = await this.searchConversations(query, limit);
      conversations.forEach((conv) => {
        results.push({
          type: 'conversation',
          content: conv,
          relevance: this.calculateRelevance(
            query,
            conv.query + ' ' + conv.response
          ),
        });
      });
    }

    if (!type || type === 'command') {
      const commands = await this.searchCommands(query, limit);
      commands.forEach((cmd) => {
        results.push({
          type: 'command',
          content: cmd,
          relevance: this.calculateRelevance(query, cmd.command),
        });
      });
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  calculateRelevance(query: string, content: string): number {
    // Focused relevance calculation logic
    const queryWords = this.tokenize(query.toLowerCase());
    const contentWords = this.tokenize(content.toLowerCase());

    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.includes(word)) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter((word) => word.length > 2);
  }
}

// src/services/memory/MemoryStatisticsService.ts
export class MemoryStatisticsService implements IMemoryStatistics {
  async getStats(data: MemoryData): Promise<MemoryStats> {
    const allTimestamps = [
      ...data.conversations.map((c) => c.timestamp),
      ...data.commands.map((c) => c.timestamp),
    ].sort();

    const memoryStr = JSON.stringify(data);
    const memorySize = Buffer.byteLength(memoryStr, 'utf8');

    return {
      totalConversations: data.conversations.length,
      totalCommands: data.commands.length,
      memorySize,
      oldestEntry: allTimestamps[0] || 'N/A',
      newestEntry: allTimestamps[allTimestamps.length - 1] || 'N/A',
    };
  }

  async getUsageMetrics(data: MemoryData): Promise<UsageMetrics> {
    // Additional metrics calculation
    return {
      averageConversationLength: this.calculateAverageLength(
        data.conversations
      ),
      mostActiveHour: this.findMostActiveHour(data),
      commandFrequency: this.calculateCommandFrequency(data.commands),
    };
  }

  async getStorageInfo(): Promise<StorageInfo> {
    // Storage-related statistics
    return {
      diskUsage: await this.calculateDiskUsage(),
      compressionRatio: await this.calculateCompressionRatio(),
    };
  }

  private calculateAverageLength(conversations: MemoryEntry[]): number {
    if (conversations.length === 0) return 0;
    const totalLength = conversations.reduce(
      (sum, conv) => sum + conv.response.length,
      0
    );
    return totalLength / conversations.length;
  }

  private findMostActiveHour(data: MemoryData): number {
    // Implementation for finding most active hour
    return 14; // Placeholder
  }

  private calculateCommandFrequency(
    commands: CommandHistoryEntry[]
  ): Map<string, number> {
    const frequency = new Map<string, number>();
    commands.forEach((cmd) => {
      const command = cmd.command.split(' ')[0];
      frequency.set(command, (frequency.get(command) || 0) + 1);
    });
    return frequency;
  }
}
```

#### Step 3: Compose Services with Facade

```typescript
// src/services/memory/MemoryServiceV2.ts
export class MemoryServiceV2 implements IMemoryService {
  private data: MemoryData | null = null;

  constructor(
    private persistence: IMemoryPersistence,
    private search: IMemorySearch,
    private statistics: IMemoryStatistics,
    private index: IMemoryIndex,
    private transfer: IMemoryTransfer,
    private conversations: IMemoryConversations,
    private commands: IMemoryCommands
  ) {}

  async initialize(): Promise<MemoryInitResult> {
    this.data = await this.persistence.load();
    return {
      conversations: this.data.conversations,
      commands: this.data.commands,
      preferences: this.data.preferences,
      workingDirectories: this.data.workingDirectories,
    };
  }

  async loadMemory(): Promise<MemoryData> {
    this.data = await this.persistence.load();
    return this.data;
  }

  async saveMemory(memory?: MemoryData): Promise<void> {
    const dataToSave = memory || this.data;
    if (!dataToSave) throw new Error('No memory data to save');

    await this.persistence.save(dataToSave);
    this.data = dataToSave;
  }

  // Delegate conversation operations
  async addConversation(
    query: string,
    response: string,
    context: ContextInfo,
    model?: AIModel
  ): Promise<void> {
    if (!this.data) await this.loadMemory();
    this.data = await this.conversations.addConversation(
      this.data!,
      query,
      response,
      context,
      model
    );
    await this.saveMemory();
  }

  async searchConversations(
    query: string,
    limit?: number
  ): Promise<MemoryEntry[]> {
    if (!this.data) await this.loadMemory();
    return this.conversations.searchConversations(this.data!, query, limit);
  }

  // Delegate command operations
  async addCommand(
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ): Promise<void> {
    if (!this.data) await this.loadMemory();
    this.data = await this.commands.addCommand(
      this.data!,
      command,
      workingDirectory,
      exitCode,
      duration
    );
    await this.saveMemory();
  }

  // Delegate search operations
  async searchMemory(
    query: string,
    limit?: number,
    type?: 'conversation' | 'command'
  ): Promise<SearchResult[]> {
    return this.search.searchAll(query, type, limit);
  }

  // Delegate statistics operations
  async getStats(): Promise<MemoryStats> {
    if (!this.data) await this.loadMemory();
    return this.statistics.getStats(this.data!);
  }

  // Delegate transfer operations
  async exportMemory(path: string): Promise<void> {
    if (!this.data) await this.loadMemory();
    return this.transfer.exportMemory(this.data!, path);
  }

  async importMemory(filePath: string): Promise<void> {
    this.data = await this.transfer.importMemory(filePath);
    await this.saveMemory();
  }

  async compressMemory(): Promise<void> {
    if (!this.data) await this.loadMemory();
    this.data = await this.transfer.compressMemory(this.data!, 30);
    await this.saveMemory();
  }

  async clearMemory(): Promise<void> {
    await this.persistence.clear();
    this.data = await this.persistence.load();
  }
}
```

#### Step 4: Update Dependency Injection

```typescript
// src/container/ServiceFactoryV2.ts
export class ServiceFactoryV2 {
  public static registerMemoryServices(container: DIContainer): void {
    // Register focused memory services
    container.register('memoryPersistence', MemoryPersistenceService, {
      dependencies: ['configuration'],
    });

    container.register('memoryIndex', MemoryIndexService);

    container.register('memorySearch', MemorySearchService, {
      dependencies: ['memoryIndex'],
    });

    container.register('memoryStatistics', MemoryStatisticsService);

    container.register('memoryTransfer', MemoryTransferService);

    container.register('memoryConversations', MemoryConversationsService);

    container.register('memoryCommands', MemoryCommandsService);

    // Register composed service
    container.registerFactory(
      'memory',
      (container) => {
        return new MemoryServiceV2(
          container.resolve('memoryPersistence'),
          container.resolve('memorySearch'),
          container.resolve('memoryStatistics'),
          container.resolve('memoryIndex'),
          container.resolve('memoryTransfer'),
          container.resolve('memoryConversations'),
          container.resolve('memoryCommands')
        );
      },
      {
        dependencies: [
          'memoryPersistence',
          'memorySearch',
          'memoryStatistics',
          'memoryIndex',
          'memoryTransfer',
          'memoryConversations',
          'memoryCommands',
        ],
      }
    );
  }
}
```

---

## Template 3: Interface Segregation Fix

### Problem: IMemoryService with 23 methods

Current interface forces all clients to depend on methods they don't use.

### Solution: Focused Interface Composition

```typescript
// Instead of one large interface, create focused interfaces
export interface IMemoryService
  extends IMemoryPersistence,
    IMemorySearch,
    IMemoryStatistics,
    IMemoryConversations,
    IMemoryCommands {
  // Only composition, no additional methods
}

// Clients depend only on what they need
class ConversationHandler {
  constructor(private conversations: IMemoryConversations) {}
  // Only has access to conversation methods
}

class StatsReporter {
  constructor(private stats: IMemoryStatistics) {}
  // Only has access to statistics methods
}

class SearchEngine {
  constructor(private search: IMemorySearch) {}
  // Only has access to search methods
}
```

---

## Migration Strategy

### Phase 1: Create New Interfaces (Week 1)

1. Create all focused interfaces
2. Implement basic service shells
3. Add comprehensive unit tests

### Phase 2: Implement Services (Week 2)

1. Implement each focused service
2. Migrate logic from MemoryService
3. Test each service independently

### Phase 3: Compose and Replace (Week 3)

1. Create facade service (MemoryServiceV2)
2. Update dependency injection
3. Gradually replace old service
4. Remove deprecated code

### Testing Strategy

```typescript
// Each service can be tested independently
describe('MemorySearchService', () => {
  it('should search conversations accurately', () => {
    const indexService = new MockMemoryIndex();
    const searchService = new MemorySearchService(indexService);

    // Test only search functionality
  });
});

describe('MemoryPersistenceService', () => {
  it('should load and save memory correctly', () => {
    const configService = new MockConfigurationService();
    const persistenceService = new MemoryPersistenceService(configService);

    // Test only persistence functionality
  });
});
```

This template-based approach ensures:

- ✅ **SRP**: Each service has single responsibility
- ✅ **OCP**: New commands/features can be added without modification
- ✅ **LSP**: All implementations are substitutable
- ✅ **ISP**: Clients depend only on what they use
- ✅ **DIP**: All dependencies are abstracted through interfaces
