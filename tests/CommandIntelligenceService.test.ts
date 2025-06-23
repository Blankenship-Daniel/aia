To create comprehensive Jest tests for the `CommandIntelligenceService` class in the AIA project, you need to follow the guidelines mentioned, including using mock utilities, dependency injection, and thorough error handling coverage. Here is a structured test suite:

```typescript
import {
  ICommandRegistry,
  IContextService,
  IMemoryService,
  IConfigurationService,
  CommandContext,
} from '../interfaces/ICommandIntelligenceService';
import { CommandIntelligenceService } from '../services/CommandIntelligenceService';
import {
  createMockCommandRegistry,
  createMockContextService,
  createMockMemoryService,
  createMockConfigurationService,
} from '../tests/__mocks__/mockFactories';

describe('CommandIntelligenceService', () => {
  let commandRegistry: jest.Mocked<ICommandRegistry>;
  let contextService: jest.Mocked<IContextService>;
  let memoryService: jest.Mocked<IMemoryService>;
  let configurationService: jest.Mocked<IConfigurationService>;
  let service: CommandIntelligenceService;

  beforeEach(() => {
    commandRegistry = createMockCommandRegistry();
    contextService = createMockContextService();
    memoryService = createMockMemoryService();
    configurationService = createMockConfigurationService();

    service = new CommandIntelligenceService(
      commandRegistry,
      contextService,
      memoryService,
      configurationService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSuggestedCommands', () => {
    it('should return project-specific suggestions', async () => {
      const context: CommandContext = { projectType: 'typescript' };
      const suggestions = await service.getSuggestedCommands(context);
      
      expect(suggestions).toHaveLength(3); // Depends on 'typescript' mappings
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          command: expect.stringContaining('agent'),
          priority: 'high',
        })
      );
    });

    it('should handle no project type gracefully', async () => {
      const context: CommandContext = {};
      const suggestions = await service.getSuggestedCommands(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          command: 'index',
        })
      );
    });
  });

  describe('recordCommandUsage', () => {
    it('should add new command usage to history', async () => {
      const command = 'index';
      const context: CommandContext = { projectType: 'typescript' };

      await service.recordCommandUsage(command, context, 500, true);

      const usage = service['commandUsageHistory'].get(command);
      expect(usage).toBeDefined();
      expect(usage?.frequency).toBe(1);
      expect(usage?.successRate).toBe(1);
      expect(usage?.averageExecutionTime).toBe(500);
    });

    it('should update existing command usage history', async () => {
      const command = 'index';
      const context: CommandContext = { projectType: 'typescript' };

      // Initial usage
      await service.recordCommandUsage(command, context, 500, true);
      // Second usage
      await service.recordCommandUsage(command, context, 300, false);

      const usage = service['commandUsageHistory'].get(command);
      expect(usage).toBeDefined();
      expect(usage?.frequency).toBe(2);
      expect(usage?.successRate).toBe(0.5);
      expect(usage?.averageExecutionTime).toBe(400); // Average of 500 and 300
    });
  });

  describe('loadUsageHistory', () => {
    it('should load command usage history from memory service', async () => {
      const mockPreferences = {
        commandUsageHistory: [
          { command: 'index', frequency: 2, lastUsed