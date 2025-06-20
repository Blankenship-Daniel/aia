/**
 * Command Intelligence Service Tests
 * Tests for interactive command suggestions and auto-completion
 */
import { CommandIntelligenceService } from '../src/services/CommandIntelligenceService';
import {
  CommandContext,
  CommandSuggestion,
} from '../src/interfaces/ICommandIntelligenceService';

describe('CommandIntelligenceService', () => {
  let service: CommandIntelligenceService;
  let mockCommandRegistry: any;
  let mockContextService: any;
  let mockMemoryService: any;
  let mockConfigurationService: any;

  beforeEach(() => {
    // Mock dependencies
    mockCommandRegistry = {
      getCommandNames: jest.fn(() => [
        'index',
        'ask',
        'agent',
        'config',
        'memory',
      ]),
      getCommand: jest.fn(),
    };

    mockContextService = {
      getCurrentContext: jest.fn(),
    };

    mockMemoryService = {
      getPreferences: jest.fn(() => Promise.resolve({})),
      updatePreferences: jest.fn(() => Promise.resolve()),
    };

    mockConfigurationService = {
      get: jest.fn(),
    };

    service = new CommandIntelligenceService(
      mockCommandRegistry,
      mockContextService,
      mockMemoryService,
      mockConfigurationService
    );
  });

  describe('getSuggestedCommands', () => {
    it('should return project-specific suggestions for TypeScript projects', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        projectType: 'typescript',
        recentCommands: [],
      };

      const suggestions = await service.getSuggestedCommands(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].contextReason).toContain('typescript');
      expect(suggestions[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should return git-based suggestions when changes are detected', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: [],
        gitStatus: {
          hasChanges: true,
          currentBranch: 'main',
          hasUncommittedFiles: true,
        },
      };

      const suggestions = await service.getSuggestedCommands(context);

      expect(suggestions.length).toBeGreaterThan(0);
      const gitSuggestion = suggestions.find((s) =>
        s.command.includes('review my changes')
      );
      expect(gitSuggestion).toBeDefined();
      expect(gitSuggestion?.priority).toBe('high');
    });

    it('should return package.json based suggestions', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: [],
        packageInfo: {
          hasPackageJson: true,
          scripts: ['build', 'test', 'start'],
          dependencies: ['react', 'typescript', 'jest'],
        },
      };

      const suggestions = await service.getSuggestedCommands(context);

      expect(suggestions.length).toBeGreaterThan(0);
      const packageSuggestion = suggestions.find((s) =>
        s.command.includes('dependencies')
      );
      expect(packageSuggestion).toBeDefined();
    });

    it('should return default suggestions when no specific context', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: [],
      };

      const suggestions = await service.getSuggestedCommands(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.command === 'index')).toBe(true);
    });
  });

  describe('getAutoCompletion', () => {
    it('should return command completions for partial input', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: [],
      };

      const result = await service.getAutoCompletion('ag', context);

      expect(result.completions).toContain('agent');
      expect(result.hasMore).toBe(false);
    });

    it('should return parameter completions for agent commands', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: [],
      };

      const result = await service.getAutoCompletion('agent "', context);

      expect(result.completions.length).toBeGreaterThan(0);
      expect(result.completions.some((c) => c.includes('analyze'))).toBe(true);
    });

    it('should return contextual completions based on project type', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        projectType: 'typescript',
        recentCommands: [],
      };

      const result = await service.getAutoCompletion('ag', context);

      expect(result.completions.length).toBeGreaterThan(0);
      expect(result.contextualInfo).toContain('typescript');
    });
  });

  describe('recordCommandUsage', () => {
    it('should record new command usage', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: [],
      };

      await service.recordCommandUsage('index', context, 1500, true);

      expect(mockMemoryService.updatePreferences).toHaveBeenCalled();
    });

    it('should update existing command usage patterns', async () => {
      // First usage
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: [],
      };

      await service.recordCommandUsage('index', context, 1500, true);
      await service.recordCommandUsage('index', context, 1200, true);

      expect(mockMemoryService.updatePreferences).toHaveBeenCalledTimes(2);
    });
  });

  describe('getWelcomeSuggestions', () => {
    it('should return welcome suggestions with high priority items', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: [],
      };

      const suggestions = await service.getWelcomeSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].command).toBe('index');
      expect(suggestions[0].priority).toBe('high');
      expect(suggestions.some((s) => s.command === 'config')).toBe(true);
    });

    it('should include project-specific welcome suggestions', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        projectType: 'typescript',
        recentCommands: [],
      };

      const suggestions = await service.getWelcomeSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(2);
      expect(
        suggestions.some((s) => s.contextReason.includes('typescript'))
      ).toBe(true);
    });
  });

  describe('getNextStepSuggestions', () => {
    it('should return next step suggestions after index command', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: ['index'],
      };

      const suggestions = await service.getNextStepSuggestions(
        'index',
        context
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].command).toContain('improvement');
      expect(suggestions[0].priority).toBe('high');
    });

    it('should return next step suggestions after config command', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        recentCommands: ['config'],
      };

      const suggestions = await service.getNextStepSuggestions(
        'config',
        context
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].command).toContain('development plan');
    });
  });

  describe('getContextualHelp', () => {
    it('should return contextual help with project information', async () => {
      const context: CommandContext = {
        workingDirectory: '/test/project',
        projectType: 'typescript',
        recentCommands: [],
        gitStatus: {
          hasChanges: true,
          currentBranch: 'main',
          hasUncommittedFiles: true,
        },
      };

      const help = await service.getContextualHelp('index', context);

      expect(help).toContain('index');
      expect(help).toContain('typescript');
      expect(help).toContain('Uncommitted changes');
    });
  });

  describe('analyzeWorkflowPatterns', () => {
    it('should analyze user workflow patterns and suggest optimizations', async () => {
      const userProfile = {
        commandHistory: [
          {
            command: 'index',
            frequency: 10,
            lastUsed: new Date(),
            averageExecutionTime: 2000,
            successRate: 0.9,
            contextPatterns: ['typescript'],
          },
          {
            command: 'ask',
            frequency: 8,
            lastUsed: new Date(),
            averageExecutionTime: 1500,
            successRate: 0.95,
            contextPatterns: ['typescript'],
          },
        ],
        preferences: {
          favoriteCommands: ['index', 'ask'],
          preferredWorkflow: 'analysis-first',
          expertiseLevel: 'intermediate' as const,
        },
        productivity: {
          mostProductiveHours: [9, 10, 14, 15],
          averageCommandsPerSession: 5.2,
          frequentPatterns: ['index -> ask', 'config -> index'],
        },
      };

      const analysis = await service.analyzeWorkflowPatterns(userProfile);

      expect(analysis.patterns.length).toBeGreaterThan(0);
      expect(analysis.suggestions.length).toBeGreaterThan(0);
      expect(analysis.optimizations.length).toBeGreaterThan(0);
      expect(analysis.patterns[0]).toContain('index');
    });
  });
});
