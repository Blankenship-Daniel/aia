# SOLID Principles Refactoring Execution Prompt

## Objective
Execute a systematic refactoring of the AIA codebase to achieve full SOLID principles compliance, targeting a score of 9/10 for each principle.

## Execution Plan Overview

This prompt guides an AI agent through a phased refactoring approach to improve code quality while maintaining 100% backward compatibility.

## Phase 1: Quick Wins (Execute First)

### 1.1 Extract Missing Interfaces
**Task**: Create interfaces for concrete classes that lack them.

**Actions**:
1. Scan `src/services/` for classes without corresponding interfaces
2. For each class found, create interface in `src/interfaces/`:
   - Extract all public methods
   - Define appropriate method signatures
   - Use TypeScript strict typing

**Example Template**:
```typescript
// filepath: src/interfaces/ISemanticAnalyzer.ts
export interface ISemanticAnalyzer {
  analyze(code: string): AnalysisResult;
  getSupportedLanguages(): string[];
}
```

### 1.2 Fix Direct Instantiations
**Task**: Convert all direct class instantiations to dependency injection.

**Search Pattern**: `new \w+\(` in all service files

**For each occurrence**:
1. Add interface type to constructor parameters
2. Update ServiceFactory registration
3. Remove direct instantiation

**Example Fix**:
```typescript
// Before:
private analyzer = new SemanticCodeAnalyzer();

// After:
constructor(private analyzer: ISemanticAnalyzer) {}
```

### 1.3 Register New Dependencies
**Task**: Update `ServiceFactory.ts` with new dependencies.

**Template**:
```typescript
// filepath: src/container/ServiceFactory.ts
// Add to registerServices method:
container.register<ISemanticAnalyzer>('SemanticAnalyzer', SemanticCodeAnalyzer);
container.register<ICodebaseSummarizer>('CodebaseSummarizer', CodebaseSummarizer);
```

## Phase 2: Memory Service Decomposition

### 2.1 Create Focused Interfaces
**Task**: Create 5 new interface files in `src/interfaces/`:

```typescript
// filepath: src/interfaces/IMemoryPersistence.ts
export interface IMemoryPersistence {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

// filepath: src/interfaces/IConversationMemory.ts
export interface IConversationMemory {
  add(conversation: Conversation): void;
  getRecent(limit?: number): Conversation[];
  search(query: string): Conversation[];
  clear(): void;
}

// filepath: src/interfaces/ICommandMemory.ts
export interface ICommandMemory {
  record(command: CommandRecord): void;
  getHistory(limit?: number): CommandRecord[];
  search(query: string): CommandRecord[];
  clear(): void;
}

// filepath: src/interfaces/IMemoryStatistics.ts
export interface IMemoryStatistics {
  getConversationCount(): number;
  getCommandCount(): number;
  getTotalTokens(): number;
  getMemoryUsage(): MemoryUsageStats;
}

// filepath: src/interfaces/IMemoryImportExport.ts
export interface IMemoryImportExport {
  export(format: 'json' | 'csv'): Promise<any>;
  import(data: any, format: 'json' | 'csv'): Promise<void>;
  validate(data: any): boolean;
}
```

### 2.2 Implement Focused Services
**Task**: Create 5 new service implementations:

```typescript
// filepath: src/services/MemoryPersistenceService.ts
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import * as fs from 'fs-extra';
import * as path from 'path';

export class MemoryPersistenceService implements IMemoryPersistence {
  constructor(private basePath: string) {}
  
  async save(key: string, data: any): Promise<void> {
    const filePath = path.join(this.basePath, `${key}.json`);
    await fs.ensureDir(this.basePath);
    await fs.writeJson(filePath, data, { spaces: 2 });
  }
  
  async load(key: string): Promise<any> {
    const filePath = path.join(this.basePath, `${key}.json`);
    if (await this.exists(key)) {
      return await fs.readJson(filePath);
    }
    return null;
  }
  
  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, `${key}.json`);
    return await fs.pathExists(filePath);
  }
  
  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, `${key}.json`);
    await fs.remove(filePath);
  }
}
```

```typescript
// filepath: src/services/ConversationMemoryService.ts
import { IConversationMemory } from '../interfaces/IConversationMemory';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import { Conversation } from '../types';

export class ConversationMemoryService implements IConversationMemory {
  private conversations: Conversation[] = [];
  private readonly STORAGE_KEY = 'conversations';
  
  constructor(private persistence: IMemoryPersistence) {
    this.load();
  }
  
  private async load(): Promise<void> {
    const data = await this.persistence.load(this.STORAGE_KEY);
    if (data) {
      this.conversations = data;
    }
  }
  
  private async save(): Promise<void> {
    await this.persistence.save(this.STORAGE_KEY, this.conversations);
  }
  
  add(conversation: Conversation): void {
    this.conversations.push(conversation);
    this.save();
  }
  
  getRecent(limit = 10): Conversation[] {
    return this.conversations.slice(-limit);
  }
  
  search(query: string): Conversation[] {
    const lowerQuery = query.toLowerCase();
    return this.conversations.filter(conv =>
      conv.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerQuery)
      )
    );
  }
  
  clear(): void {
    this.conversations = [];
    this.save();
  }
}
```

### 2.3 Create Composite Service
**Task**: Create backward-compatible composite service:

```typescript
// filepath: src/services/CompositeMemoryService.ts
import { IMemoryService } from '../interfaces/IMemoryService';
import { IConversationMemory } from '../interfaces/IConversationMemory';
import { ICommandMemory } from '../interfaces/ICommandMemory';
import { IMemoryStatistics } from '../interfaces/IMemoryStatistics';
import { IMemoryImportExport } from '../interfaces/IMemoryImportExport';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';

export class CompositeMemoryService implements IMemoryService {
  constructor(
    private persistence: IMemoryPersistence,
    private conversations: IConversationMemory,
    private commands: ICommandMemory,
    private statistics: IMemoryStatistics,
    private importExport: IMemoryImportExport
  ) {}
  
  // Delegate all IMemoryService methods to appropriate services
  addConversation(conversation: Conversation): void {
    this.conversations.add(conversation);
  }
  
  getRecentConversations(limit: number): Conversation[] {
    return this.conversations.getRecent(limit);
  }
  
  searchConversations(query: string): Conversation[] {
    return this.conversations.search(query);
  }
  
  // ... implement all other IMemoryService methods by delegation
}
```

### 2.4 Update Service Registration
**Task**: Update ServiceFactory to register new services:

```typescript
// filepath: src/container/ServiceFactory.ts
// Add to registerServices method:

// Register memory persistence first
const memoryPath = path.join(os.homedir(), '.aia', 'memory');
container.register<IMemoryPersistence>(
  'MemoryPersistence',
  () => new MemoryPersistenceService(memoryPath)
);

// Register sub-services
container.register<IConversationMemory>(
  'ConversationMemory',
  ConversationMemoryService
);

container.register<ICommandMemory>(
  'CommandMemory',
  CommandMemoryService
);

container.register<IMemoryStatistics>(
  'MemoryStatistics',
  MemoryStatisticsService
);

container.register<IMemoryImportExport>(
  'MemoryImportExport',
  MemoryImportExportService
);

// Register composite service for backward compatibility
container.register<IMemoryService>(
  'MemoryService',
  CompositeMemoryService
);
```

## Phase 3: Fix Configuration Service

### 3.1 Extract Validation Service
**Task**: Create configuration validator:

```typescript
// filepath: src/services/ConfigurationValidator.ts
import { IConfigurationValidator } from '../interfaces/IConfigurationValidator';

export class ConfigurationValidator implements IConfigurationValidator {
  validateApiKey(key: string, provider: string): boolean {
    if (!key || typeof key !== 'string') return false;
    
    switch (provider) {
      case 'openai':
        return key.startsWith('sk-') && key.length > 20;
      case 'anthropic':
        return key.startsWith('sk-ant-') && key.length > 20;
      case 'gemini':
        return key.length > 20;
      default:
        return key.length > 0;
    }
  }
  
  validateModel(model: string, provider: string): boolean {
    const validModels = {
      openai: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      gemini: ['gemini-pro', 'gemini-pro-vision']
    };
    
    return validModels[provider]?.includes(model) || false;
  }
  
  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (!config.provider) {
      errors.push('Provider is required');
    }
    
    if (!this.validateApiKey(config.apiKey, config.provider)) {
      errors.push('Invalid API key format');
    }
    
    if (!this.validateModel(config.model, config.provider)) {
      errors.push('Invalid model for provider');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### 3.2 Extract Profile Manager
**Task**: Create profile management service:

```typescript
// filepath: src/services/ProfileManager.ts
import { IProfileManager } from '../interfaces/IProfileManager';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';

export class ProfileManager implements IProfileManager {
  private profiles: Map<string, Profile> = new Map();
  private activeProfile: string = 'default';
  
  constructor(private persistence: IMemoryPersistence) {
    this.load();
  }
  
  create(name: string, config?: Partial<Profile>): Profile {
    const profile: Profile = {
      name,
      created: new Date(),
      config: config || {},
      ...config
    };
    
    this.profiles.set(name, profile);
    this.save();
    return profile;
  }
  
  switch(name: string): void {
    if (!this.profiles.has(name)) {
      throw new Error(`Profile '${name}' not found`);
    }
    this.activeProfile = name;
    this.save();
  }
  
  list(): Profile[] {
    return Array.from(this.profiles.values());
  }
  
  getActive(): Profile {
    return this.profiles.get(this.activeProfile) || this.create('default');
  }
  
  delete(name: string): void {
    if (name === 'default') {
      throw new Error('Cannot delete default profile');
    }
    this.profiles.delete(name);
    if (this.activeProfile === name) {
      this.activeProfile = 'default';
    }
    this.save();
  }
  
  private async load(): Promise<void> {
    const data = await this.persistence.load('profiles');
    if (data) {
      this.profiles = new Map(data.profiles);
      this.activeProfile = data.activeProfile;
    }
  }
  
  private async save(): Promise<void> {
    await this.persistence.save('profiles', {
      profiles: Array.from(this.profiles.entries()),
      activeProfile: this.activeProfile
    });
  }
}
```

## Phase 4: Implement AI Provider Strategy

### 4.1 Create Provider Interface
**Task**: Define AI provider contract:

```typescript
// filepath: src/interfaces/IAIProvider.ts
export interface IAIProvider {
  name: string;
  call(prompt: string, options: AICallOptions): Promise<string>;
  validateConfig(config: any): boolean;
  getModelCapabilities(): ModelCapabilities;
  estimateTokens(text: string): number;
}

export interface AICallOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  systemPrompt?: string;
}

export interface ModelCapabilities {
  maxTokens: number;
  supportsFunctions: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
}
```

### 4.2 Implement Provider Strategy
**Task**: Create provider implementations:

```typescript
// filepath: src/services/providers/OpenAIProvider.ts
import { IAIProvider, AICallOptions, ModelCapabilities } from '../../interfaces/IAIProvider';
import OpenAI from 'openai';

export class OpenAIProvider implements IAIProvider {
  name = 'openai';
  private client: OpenAI;
  
  constructor(private apiKey: string, private model: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async call(prompt: string, options: AICallOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: options.systemPrompt || '' },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP
    });
    
    return response.choices[0].message.content || '';
  }
  
  validateConfig(config: any): boolean {
    return config.apiKey?.startsWith('sk-') && 
           ['gpt-4', 'gpt-3.5-turbo'].includes(config.model);
  }
  
  getModelCapabilities(): ModelCapabilities {
    return {
      maxTokens: this.model.includes('gpt-4') ? 8192 : 4096,
      supportsFunctions: true,
      supportsVision: this.model.includes('vision'),
      supportsStreaming: true
    };
  }
  
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
```

### 4.3 Create Provider Factory
**Task**: Implement provider factory:

```typescript
// filepath: src/services/AIProviderFactory.ts
import { IAIProvider } from '../interfaces/IAIProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';

export class AIProviderFactory {
  static create(provider: string, config: any): IAIProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider(config.apiKey, config.model);
      case 'anthropic':
        return new AnthropicProvider(config.apiKey, config.model);
      case 'gemini':
        return new GeminiProvider(config.apiKey, config.model);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }
  
  static getAvailableProviders(): string[] {
    return ['openai', 'anthropic', 'gemini'];
  }
}
```

### 4.4 Update AIService
**Task**: Refactor AIService to use provider strategy:

```typescript
// filepath: src/services/AIService.ts
// Update AIService to use IAIProvider

export class AIService implements IAIService {
  private provider: IAIProvider;
  
  constructor(
    private configService: IConfigurationService,
    private contextService: IContextService,
    private conversationMemory: IConversationMemory
  ) {
    this.initializeProvider();
  }
  
  private initializeProvider(): void {
    const config = this.configService.getAIConfig();
    this.provider = AIProviderFactory.create(config.provider, config);
  }
  
  async query(prompt: string, options?: QueryOptions): Promise<string> {
    const context = await this.contextService.getContext();
    const enhancedPrompt = this.enhancePromptWithContext(prompt, context);
    
    const response = await this.provider.call(enhancedPrompt, {
      temperature: options?.temperature || 0.7,
      maxTokens: options?.maxTokens || 2000,
      systemPrompt: this.getSystemPrompt()
    });
    
    // Store in conversation memory
    this.conversationMemory.add({
      id: Date.now().toString(),
      timestamp: new Date(),
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: response }
      ]
    });
    
    return response;
  }
}
```

## Phase 5: Testing and Validation

### 5.1 Create Comprehensive Tests
**Task**: Add tests for all new services:

```typescript
// filepath: tests/services/ConversationMemoryService.test.ts
import { ConversationMemoryService } from '../../src/services/ConversationMemoryService';
import { MemoryPersistenceService } from '../../src/services/MemoryPersistenceService';

describe('ConversationMemoryService', () => {
  let service: ConversationMemoryService;
  let persistence: MemoryPersistenceService;
  
  beforeEach(() => {
    persistence = new MemoryPersistenceService('/tmp/test-memory');
    service = new ConversationMemoryService(persistence);
  });
  
  test('should add and retrieve conversations', () => {
    const conversation = {
      id: '1',
      timestamp: new Date(),
      messages: [{ role: 'user', content: 'test' }]
    };
    
    service.add(conversation);
    const recent = service.getRecent(1);
    
    expect(recent).toHaveLength(1);
    expect(recent[0]).toEqual(conversation);
  });
  
  test('should search conversations', () => {
    service.add({
      id: '1',
      timestamp: new Date(),
      messages: [{ role: 'user', content: 'hello world' }]
    });
    
    service.add({
      id: '2',
      timestamp: new Date(),
      messages: [{ role: 'user', content: 'goodbye' }]
    });
    
    const results = service.search('hello');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });
});
```

### 5.2 Integration Testing
**Task**: Create integration tests:

```typescript
// filepath: tests/integration/memory-services.test.ts
describe('Memory Services Integration', () => {
  test('composite service maintains backward compatibility', async () => {
    const container = new DIContainer();
    const factory = new ServiceFactory();
    factory.registerServices(container);
    
    const memoryService = container.resolve<IMemoryService>('MemoryService');
    const conversation = {
      id: '1',
      timestamp: new Date(),
      messages: []
    };
    
    // Old API should still work
    memoryService.addConversation(conversation);
    const recent = memoryService.getRecentConversations(1);
    
    expect(recent).toHaveLength(1);
    expect(recent[0]).toEqual(conversation);
  });
});
```

## Execution Checklist

### Pre-Refactoring
- [ ] Create feature branch: `git checkout -b solid-refactoring`
- [ ] Run existing tests: `npm test`
- [ ] Document current test coverage
- [ ] Create backup of current implementation

### Phase 1 Execution (Day 1)
- [ ] Extract missing interfaces (1.1)
- [ ] Fix direct instantiations (1.2)
- [ ] Update ServiceFactory registrations (1.3)
- [ ] Run tests to ensure no regressions

### Phase 2 Execution (Days 2-3)
- [ ] Create memory interfaces (2.1)
- [ ] Implement focused services (2.2)
- [ ] Create composite service (2.3)
- [ ] Update service registration (2.4)
- [ ] Add comprehensive tests
- [ ] Verify backward compatibility

### Phase 3 Execution (Day 4)
- [ ] Extract ConfigurationValidator (3.1)
- [ ] Extract ProfileManager (3.2)
- [ ] Update ConfigurationService
- [ ] Add tests for new services

### Phase 4 Execution (Day 5)
- [ ] Create AI provider interface (4.1)
- [ ] Implement provider strategies (4.2)
- [ ] Create provider factory (4.3)
- [ ] Update AIService (4.4)
- [ ] Test all AI providers

### Post-Refactoring
- [ ] Run full test suite
- [ ] Update documentation
- [ ] Performance benchmarking
- [ ] Code review
- [ ] Merge to main branch

## Success Metrics

### SOLID Compliance Targets
- [ ] SRP: 9/10 - Each class has single responsibility
- [ ] OCP: 9/10 - New features via extension, not modification
- [ ] LSP: 9/10 - All implementations are substitutable
- [ ] ISP: 9/10 - Interfaces are client-specific
- [ ] DIP: 9/10 - Dependencies on abstractions only

### Code Quality Metrics
- [ ] 40% reduction in average class size
- [ ] 60% reduction in interface size
- [ ] 100% dependency injection usage
- [ ] Zero direct instantiations in services
- [ ] 90%+ test coverage for new code

### Performance Targets
- [ ] No performance regressions
- [ ] <100ms service initialization
- [ ] Memory usage within 10% of baseline

## Error Handling

If any step fails:
1. Check error messages and stack traces
2. Verify all dependencies are registered
3. Ensure interfaces match implementations
4. Check for circular dependencies
5. Run tests incrementally

## Notes for AI Agent

- Maintain backward compatibility at all times
- Use existing patterns from the codebase
- Follow TypeScript best practices
- Add JSDoc comments for all public methods
- Create comprehensive tests for each new service
- Update imports in affected files
- Verify no breaking changes to CLI commands

Execute this refactoring systematically, testing after each phase to ensure stability and backward compatibility.