# SOLID Principles Implementation Guide

## Critical Refactoring: Memory Service Decomposition

Based on the SOLID analysis, here's a step-by-step implementation guide for the most critical refactoring needed.

---

## Step 1: Create Focused Memory Interfaces

### 1.1 Memory Persistence Interface

```typescript
// src/interfaces/IMemoryPersistence.ts
export interface IMemoryPersistence {
  /**
   * Load memory data from persistent storage
   */
  loadMemory(): Promise<MemoryData>;

  /**
   * Save memory data to persistent storage
   */
  saveMemory(data: MemoryData): Promise<void>;

  /**
   * Check if memory file exists
   */
  exists(): Promise<boolean>;

  /**
   * Get memory file path
   */
  getMemoryPath(): string;
}
```

### 1.2 Conversation Memory Interface

```typescript
// src/interfaces/IConversationMemory.ts
export interface IConversationMemory {
  /**
   * Add a conversation to memory
   */
  addConversation(
    query: string,
    response: string,
    context: ContextInfo,
    model?: AIModel | null
  ): Promise<void>;

  /**
   * Search conversations using semantic search
   */
  searchConversations(query: string, limit?: number): Promise<MemoryEntry[]>;

  /**
   * Get recent conversations
   */
  getRecentConversations(limit?: number): Promise<MemoryEntry[]>;
}
```

### 1.3 Command Memory Interface

```typescript
// src/interfaces/ICommandMemory.ts
export interface ICommandMemory {
  /**
   * Add a command to memory
   */
  addCommand(
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ): Promise<void>;

  /**
   * Search command history
   */
  searchCommands(query: string, limit?: number): Promise<CommandHistoryEntry[]>;

  /**
   * Get recent commands
   */
  getRecentCommands(limit?: number): Promise<CommandHistoryEntry[]>;
}
```

### 1.4 Memory Statistics Interface

```typescript
// src/interfaces/IMemoryStatistics.ts
export interface IMemoryStatistics {
  /**
   * Get memory statistics
   */
  getStats(): Promise<{
    totalConversations: number;
    totalCommands: number;
    memorySize: number;
    oldestEntry: string;
    newestEntry: string;
  }>;
}
```

### 1.5 Memory Import/Export Interface

```typescript
// src/interfaces/IMemoryImportExport.ts
export interface IMemoryImportExport {
  /**
   * Export memory to file
   */
  exportMemory(path: string): Promise<void>;

  /**
   * Import memory from file
   */
  importMemory(path: string): Promise<void>;

  /**
   * Compress memory by removing old entries
   */
  compressMemory(): Promise<void>;

  /**
   * Clear all memory
   */
  clearMemory(): Promise<void>;
}
```

---

## Step 2: Implement Focused Services

### 2.1 Memory Persistence Service

```typescript
// src/services/MemoryPersistenceService.ts
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { MemoryData } from '../types/index';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export class MemoryPersistenceService implements IMemoryPersistence {
  private memoryPath: string;

  constructor(private configService: IConfigurationService) {
    this.memoryPath = path.join(os.homedir(), '.aia', 'memory.json');
  }

  async loadMemory(): Promise<MemoryData> {
    try {
      if (await this.exists()) {
        const data = await fs.readJson(this.memoryPath);
        return this.validateAndMergeWithDefaults(data);
      }
      return this.getDefaultMemory();
    } catch (error) {
      console.warn(
        'Failed to load memory, using defaults:',
        (error as Error).message
      );
      return this.getDefaultMemory();
    }
  }

  async saveMemory(data: MemoryData): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.memoryPath));
      await fs.writeJson(this.memoryPath, data, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save memory: ${(error as Error).message}`);
    }
  }

  async exists(): Promise<boolean> {
    return fs.pathExists(this.memoryPath);
  }

  getMemoryPath(): string {
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

  private validateAndMergeWithDefaults(data: any): MemoryData {
    const defaultMemory = this.getDefaultMemory();
    return {
      conversations: Array.isArray(data.conversations)
        ? data.conversations
        : defaultMemory.conversations,
      commands: Array.isArray(data.commands)
        ? data.commands
        : defaultMemory.commands,
      preferences:
        data.preferences && typeof data.preferences === 'object'
          ? data.preferences
          : defaultMemory.preferences,
      workingDirectories:
        data.workingDirectories && typeof data.workingDirectories === 'object'
          ? data.workingDirectories
          : defaultMemory.workingDirectories,
      semanticIndex:
        data.semanticIndex && typeof data.semanticIndex === 'object'
          ? data.semanticIndex
          : defaultMemory.semanticIndex,
      agenticHistory: Array.isArray(data.agenticHistory)
        ? data.agenticHistory
        : defaultMemory.agenticHistory,
    };
  }
}
```

### 2.2 Conversation Memory Service

````typescript
// src/services/ConversationMemoryService.ts
import { IConversationMemory } from '../interfaces/IConversationMemory';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import { MemoryEntry, ContextInfo, AIModel } from '../types/index';

export class ConversationMemoryService implements IConversationMemory {
  constructor(private persistence: IMemoryPersistence) {}

  async addConversation(
    query: string,
    response: string,
    context: ContextInfo,
    model?: AIModel | null
  ): Promise<void> {
    const memory = await this.persistence.loadMemory();

    const entry: MemoryEntry = {
      query,
      response,
      timestamp: new Date().toISOString(),
      context: context as unknown as Record<string, unknown>,
      semanticTags: this.extractSemanticTags(query, response),
      confidence: this.calculateConfidence(query, response, model),
    };

    memory.conversations.push(entry);

    // Keep only recent conversations to prevent memory bloat
    const maxConversations = 1000;
    if (memory.conversations.length > maxConversations) {
      memory.conversations = memory.conversations.slice(-maxConversations);
    }

    await this.persistence.saveMemory(memory);
  }

  async searchConversations(
    query: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    const memory = await this.persistence.loadMemory();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const results: Array<{ entry: MemoryEntry; score: number }> = [];

    for (const conversation of memory.conversations) {
      const score = this.calculateSemanticScore(queryWords, conversation);
      if (score > 0.1) {
        results.push({ entry: conversation, score });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((result) => result.entry);
  }

  async getRecentConversations(limit: number = 10): Promise<MemoryEntry[]> {
    const memory = await this.persistence.loadMemory();
    return memory.conversations.slice(-limit);
  }

  private extractSemanticTags(query: string, response: string): string[] {
    // Extract meaningful keywords from query and response
    const text = `${query} ${response}`.toLowerCase();
    const words = text
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 3 &&
          ![
            'this',
            'that',
            'with',
            'from',
            'they',
            'have',
            'will',
            'been',
            'said',
          ].includes(word)
      );

    return [...new Set(words)].slice(0, 10);
  }

  private calculateConfidence(
    query: string,
    response: string,
    model?: AIModel | null
  ): number {
    let confidence = 0.5;

    if (response.length > 100) confidence += 0.2;
    if (response.length > 500) confidence += 0.2;

    if (
      response.includes('```') ||
      response.includes('function') ||
      response.includes('class')
    ) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateSemanticScore(
    queryWords: string[],
    conversation: MemoryEntry
  ): number {
    const conversationText =
      `${conversation.query} ${conversation.response}`.toLowerCase();
    const conversationWords = conversationText.split(/\s+/);

    let score = 0;
    for (const queryWord of queryWords) {
      if (conversationText.includes(queryWord)) {
        score += 1;
      }
    }

    return queryWords.length > 0 ? score / queryWords.length : 0;
  }
}
````

### 2.3 Command Memory Service

```typescript
// src/services/CommandMemoryService.ts
import { ICommandMemory } from '../interfaces/ICommandMemory';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import { CommandHistoryEntry } from '../types/index';

export class CommandMemoryService implements ICommandMemory {
  constructor(private persistence: IMemoryPersistence) {}

  async addCommand(
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ): Promise<void> {
    const memory = await this.persistence.loadMemory();

    const entry: CommandHistoryEntry = {
      command,
      timestamp: new Date().toISOString(),
      workingDirectory,
      exitCode,
      duration,
      optimized: false,
    };

    memory.commands.push(entry);

    // Keep only recent commands
    const maxCommands = 500;
    if (memory.commands.length > maxCommands) {
      memory.commands = memory.commands.slice(-maxCommands);
    }

    await this.persistence.saveMemory(memory);
  }

  async searchCommands(
    query: string,
    limit: number = 10
  ): Promise<CommandHistoryEntry[]> {
    const memory = await this.persistence.loadMemory();
    const queryLower = query.toLowerCase();
    const results: Array<{ entry: CommandHistoryEntry; score: number }> = [];

    for (const command of memory.commands) {
      let score = 0;

      // Exact match gets highest score
      if (command.command.toLowerCase().includes(queryLower)) {
        score = 1.0;
      } else {
        // Partial word matches
        const commandWords = command.command.toLowerCase().split(/\s+/);
        const matchedWords = commandWords.filter((word) =>
          word.includes(queryLower)
        ).length;
        score = matchedWords / commandWords.length;
      }

      if (score > 0) {
        results.push({ entry: command, score });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((result) => result.entry);
  }

  async getRecentCommands(limit: number = 10): Promise<CommandHistoryEntry[]> {
    const memory = await this.persistence.loadMemory();
    return memory.commands.slice(-limit);
  }
}
```

### 2.4 Memory Statistics Service

```typescript
// src/services/MemoryStatisticsService.ts
import { IMemoryStatistics } from '../interfaces/IMemoryStatistics';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';

export class MemoryStatisticsService implements IMemoryStatistics {
  constructor(private persistence: IMemoryPersistence) {}

  async getStats(): Promise<{
    totalConversations: number;
    totalCommands: number;
    memorySize: number;
    oldestEntry: string;
    newestEntry: string;
  }> {
    const memory = await this.persistence.loadMemory();

    const allTimestamps = [
      ...memory.conversations.map((c) => c.timestamp),
      ...memory.commands.map((c) => c.timestamp),
    ].sort();

    const memoryStr = JSON.stringify(memory);
    const memorySize = Buffer.byteLength(memoryStr, 'utf8');

    return {
      totalConversations: memory.conversations.length,
      totalCommands: memory.commands.length,
      memorySize,
      oldestEntry: allTimestamps[0] || 'N/A',
      newestEntry: allTimestamps[allTimestamps.length - 1] || 'N/A',
    };
  }
}
```

---

## Step 3: Update Service Factory Registration

### 3.1 Register New Services

```typescript
// src/container/ServiceFactory.ts - Updated registerCoreServices method
public static registerCoreServices(container: DIContainer): void {
  // Configuration Service (no dependencies - foundational)
  container.registerFactory('configuration', (container) => {
    const { ConfigurationService } = require('../../dist/services/ConfigurationService');
    return new ConfigurationService();
  });

  // Memory Persistence Service (depends on configuration)
  container.registerFactory(
    'memoryPersistence',
    (container) => {
      const { MemoryPersistenceService } = require('../../dist/services/MemoryPersistenceService');
      const config = container.resolve('configuration');
      return new MemoryPersistenceService(config);
    },
    {
      dependencies: ['configuration'],
    }
  );

  // Conversation Memory Service (depends on persistence)
  container.registerFactory(
    'conversationMemory',
    (container) => {
      const { ConversationMemoryService } = require('../../dist/services/ConversationMemoryService');
      const persistence = container.resolve('memoryPersistence');
      return new ConversationMemoryService(persistence);
    },
    {
      dependencies: ['memoryPersistence'],
    }
  );

  // Command Memory Service (depends on persistence)
  container.registerFactory(
    'commandMemory',
    (container) => {
      const { CommandMemoryService } = require('../../dist/services/CommandMemoryService');
      const persistence = container.resolve('memoryPersistence');
      return new CommandMemoryService(persistence);
    },
    {
      dependencies: ['memoryPersistence'],
    }
  );

  // Memory Statistics Service (depends on persistence)
  container.registerFactory(
    'memoryStatistics',
    (container) => {
      const { MemoryStatisticsService } = require('../../dist/services/MemoryStatisticsService');
      const persistence = container.resolve('memoryPersistence');
      return new MemoryStatisticsService(persistence);
    },
    {
      dependencies: ['memoryPersistence'],
    }
  );

  // Memory Import/Export Service (depends on persistence)
  container.registerFactory(
    'memoryImportExport',
    (container) => {
      const { MemoryImportExportService } = require('../../dist/services/MemoryImportExportService');
      const persistence = container.resolve('memoryPersistence');
      return new MemoryImportExportService(persistence);
    },
    {
      dependencies: ['memoryPersistence'],
    }
  );

  // Backward compatibility - Composite Memory Service
  container.registerFactory(
    'memory',
    (container) => {
      const { CompositeMemoryService } = require('../../dist/services/CompositeMemoryService');
      const persistence = container.resolve('memoryPersistence');
      const conversation = container.resolve('conversationMemory');
      const command = container.resolve('commandMemory');
      const statistics = container.resolve('memoryStatistics');
      const importExport = container.resolve('memoryImportExport');
      return new CompositeMemoryService(persistence, conversation, command, statistics, importExport);
    },
    {
      dependencies: ['memoryPersistence', 'conversationMemory', 'commandMemory', 'memoryStatistics', 'memoryImportExport'],
    }
  );

  // Continue with other services...
}
```

---

## Step 4: Migration Strategy

### 4.1 Backward Compatibility Service

```typescript
// src/services/CompositeMemoryService.ts
import { IMemoryService } from '../interfaces/IMemoryService';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import { IConversationMemory } from '../interfaces/IConversationMemory';
import { ICommandMemory } from '../interfaces/ICommandMemory';
import { IMemoryStatistics } from '../interfaces/IMemoryStatistics';
import { IMemoryImportExport } from '../interfaces/IMemoryImportExport';

/**
 * Composite Memory Service - Backward Compatibility
 *
 * This service maintains the old IMemoryService interface
 * while delegating to the new focused services internally.
 *
 * This allows gradual migration of client code.
 */
export class CompositeMemoryService implements IMemoryService {
  constructor(
    private persistence: IMemoryPersistence,
    private conversation: IConversationMemory,
    private command: ICommandMemory,
    private statistics: IMemoryStatistics,
    private importExport: IMemoryImportExport
  ) {}

  // Delegate to focused services
  async initialize() {
    return this.persistence.loadMemory();
  }
  async loadMemory() {
    return this.persistence.loadMemory();
  }
  async saveMemory(memory?: any) {
    return this.persistence.saveMemory(memory);
  }

  async addConversation(
    query: string,
    response: string,
    context: any,
    model?: any
  ) {
    return this.conversation.addConversation(query, response, context, model);
  }

  async searchConversations(query: string, limit?: number) {
    return this.conversation.searchConversations(query, limit);
  }

  async addCommand(
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ) {
    return this.command.addCommand(
      command,
      workingDirectory,
      exitCode,
      duration
    );
  }

  async searchCommands(query: string, limit?: number) {
    return this.command.searchCommands(query, limit);
  }

  async getStats() {
    return this.statistics.getStats();
  }

  async exportMemory(path: string) {
    return this.importExport.exportMemory(path);
  }

  async importMemory(path: string) {
    return this.importExport.importMemory(path);
  }

  async clearMemory() {
    return this.importExport.clearMemory();
  }

  // ... implement all other IMemoryService methods by delegating
}
```

### 4.2 Client Migration Example

```typescript
// Before: Using fat interface
export class AIService implements IAIService {
  constructor(
    private configService: IConfigurationService,
    private memoryService: IMemoryService // Fat interface
  ) {}

  async processQuery(query: string, response: string, context: ContextInfo) {
    // Using only conversation-related methods
    await this.memoryService.addConversation(query, response, context);
  }
}

// After: Using focused interface
export class AIService implements IAIService {
  constructor(
    private configService: IConfigurationService,
    private conversationMemory: IConversationMemory // Focused interface
  ) {}

  async processQuery(query: string, response: string, context: ContextInfo) {
    // Clear dependency - only uses conversation methods
    await this.conversationMemory.addConversation(query, response, context);
  }
}
```

---

## Step 5: Testing Strategy

### 5.1 Interface Compliance Tests

```typescript
// tests/memory/MemoryPersistence.test.ts
describe('MemoryPersistenceService', () => {
  let service: IMemoryPersistence;

  beforeEach(() => {
    service = new MemoryPersistenceService(mockConfigService);
  });

  it('should implement IMemoryPersistence contract', () => {
    expect(service.loadMemory).toBeDefined();
    expect(service.saveMemory).toBeDefined();
    expect(service.exists).toBeDefined();
    expect(service.getMemoryPath).toBeDefined();
  });

  it('should load and save memory correctly', async () => {
    const testData = { conversations: [], commands: [] };
    await service.saveMemory(testData);
    const loaded = await service.loadMemory();
    expect(loaded).toEqual(testData);
  });
});
```

### 5.2 Substitutability Tests

```typescript
// tests/memory/Substitutability.test.ts
describe('Memory Service Substitutability', () => {
  it('should allow swapping conversation memory implementations', async () => {
    const mockConversationMemory: IConversationMemory = {
      addConversation: jest.fn(),
      searchConversations: jest.fn(),
      getRecentConversations: jest.fn(),
    };

    // Should work with any IConversationMemory implementation
    const aiService = new AIService(mockConfig, mockConversationMemory);
    await aiService.processQuery('test', 'response', {});

    expect(mockConversationMemory.addConversation).toHaveBeenCalled();
  });
});
```

---

## Implementation Timeline

### Phase 1: Interface Creation (Day 1)

- [ ] Create all focused memory interfaces
- [ ] Add to `src/interfaces/` directory
- [ ] Update exports in `src/types/index.ts`

### Phase 2: Service Implementation (Days 2-3)

- [ ] Implement `MemoryPersistenceService`
- [ ] Implement `ConversationMemoryService`
- [ ] Implement `CommandMemoryService`
- [ ] Implement `MemoryStatisticsService`
- [ ] Implement `MemoryImportExportService`

### Phase 3: Registration and Testing (Day 4)

- [ ] Update `ServiceFactory` registration
- [ ] Create `CompositeMemoryService` for backward compatibility
- [ ] Write unit tests for all new services
- [ ] Ensure all tests pass

### Phase 4: Gradual Client Migration (Day 5)

- [ ] Update `AIService` to use `IConversationMemory`
- [ ] Update `CommandService` to use `ICommandMemory`
- [ ] Update `MemoryCommand` to use focused interfaces
- [ ] Remove `CompositeMemoryService` when no longer needed

This refactoring will reduce the `MemoryService` from 700+ lines to focused services under 200 lines each, dramatically improving maintainability and testability while adhering to SOLID principles.
