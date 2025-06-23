Here's a suite of Jest tests for the `AnalyticsCommand` class from your `AnalyticsCommand.ts` file, following the specifications and patterns provided:

```typescript
import { AnalyticsCommand } from '../src/commands/AnalyticsCommand';
import { CommandOptionsSetMock, AnalyticsServiceMock, ContextServiceMock } from '../tests/__mocks__';
import { IAnalyticsService } from '../src/interfaces/IAnalyticsService';
import { IContextService } from '../src/interfaces/IContextService';
import { CommandResult } from '../src/types/index';

jest.mock('../tests/__mocks__/AnalyticsServiceMock');
jest.mock('../tests/__mocks__/ContextServiceMock');

describe('AnalyticsCommand Tests', () => {
  let analyticsCommand: AnalyticsCommand;
  let analyticsService: jest.Mocked<IAnalyticsService>;
  let contextService: jest.Mocked<IContextService>;

  beforeEach(() => {
    analyticsService = new AnalyticsServiceMock() as jest.Mocked<IAnalyticsService>;
    contextService = new ContextServiceMock() as jest.Mocked<IContextService>;
    analyticsCommand = new AnalyticsCommand(analyticsService, contextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute() - Success Scenarios', () => {
    it('should execute showUsageAnalytics when options.usage is true', async () => {
      // Arrange
      const options = { usage: true } as CommandOptionsSetMock;
      analyticsService.getUsageAnalytics.mockResolvedValue({
        totalCommands: 150,
        uniqueFeatures: 12,
        averageSessionLength: 70.3,
        productivityScore: 8.3,
        mostUsedCommands: [],
        featureAdoption: [],
        timeDistribution: { mostProductiveTime: '14:00', peakHours: [13, 14] },
        errorPatterns: [],
      });

      // Act
      const result = await analyticsCommand.execute({}, [], options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toContain('Analytics command executed successfully');
      expect(analyticsService.getUsageAnalytics).toHaveBeenCalled();
    });

    it('should execute showPerformanceAnalytics when options.performance is true', async () => {
      // Arrange
      const options = { performance: true } as CommandOptionsSetMock;
      analyticsService.getPerformanceAnalytics.mockResolvedValue({
        averageExecutionTime: 120.5,
        cacheEfficiency: 0.85,
        performanceImprovement: 1.9,
        commandPerformance: [],
        slowestCommands: [],
        fastestCommands: [],
        performanceTrends: [],
      });

      // Act
      const result = await analyticsCommand.execute({}, [], options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toContain('Analytics command executed successfully');
      expect(analyticsService.getPerformanceAnalytics).toHaveBeenCalled();
    });

    it('should execute showProductivityReport when options.productivity is true', async () => {
      // Arrange
      const options = { productivity: true } as CommandOptionsSetMock;
      analyticsService.generateProductivityReport.mockResolvedValue({
        timePeriod: { start: new Date(), end: new Date() },
        metrics: {
          commandsExecuted: 543,
          timesSaved: 134.7,
          errorsAvoided: 32,
          featuresDiscovered: 14,
        },
        score: 9.0,
        insights: [],
        recommendations: [],
      });

      // Act
      const result = await analyticsCommand.execute({}, [], options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toContain('Analytics command executed successfully');
      expect(analyticsService.generateProductivityReport).toHaveBeenCalled();
    });
  });

  describe('execute() - Error Scenarios', () => {
    it('should return failure when