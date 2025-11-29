To generate comprehensive tests for the `IAnalyticsService` interface, we need to create tests that cover both the standard functionality and the error handling paths. The implementation will be assumed to have corresponding mock utilities and infrastructure to be set up to support this specification.

Here's an example of how the Jest tests could be structured:

### Jest Test File: `tests/services/AnalyticsService.test.ts`

```typescript
import { IAnalyticsService } from '../../src/interfaces/IAnalyticsService';
import { mockAnalyticsService } from '../__mocks__/AnalyticsService';
import {
  CommandUsage,
  TimeDistribution,
  FeatureUsage,
  ErrorPattern,
  UsageAnalytics,
  PerformanceAnalytics,
  ProductivityReport,
  UsageTrend,
  OptimizationRecommendation,
} from '../../src/types/index';

describe('IAnalyticsService', () => {
  let analyticsService: IAnalyticsService;

  beforeEach(() => {
    analyticsService = mockAnalyticsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsageAnalytics', () => {
    it('should return usage analytics successfully', async () => {
      const mockUsageAnalytics: UsageAnalytics = {
        mostUsedCommands: [],
        timeDistribution: {} as TimeDistribution,
        featureAdoption: [],
        errorPatterns: [],
        totalCommands: 1000,
        uniqueFeatures: 10,
        averageSessionLength: 30,
        productivityScore: 85,
      };

      jest.spyOn(analyticsService, 'getUsageAnalytics').mockResolvedValue(mockUsageAnalytics);

      const result = await analyticsService.getUsageAnalytics();
      expect(result).toEqual(mockUsageAnalytics);
    });

    it('should handle errors when fetching usage analytics', async () => {
      const errorMessage = 'Failed to fetch usage analytics';
      jest.spyOn(analyticsService, 'getUsageAnalytics').mockRejectedValue(new Error(errorMessage));

      await expect(analyticsService.getUsageAnalytics()).rejects.toThrow(errorMessage);
    });
  });

  describe('recordCommandExecution', () => {
    it('should record command execution successfully', async () => {
      const command = 'generateReport';
      const executionTime = 123;
      const success = true;

      await expect(
        analyticsService.recordCommandExecution(command, executionTime, success)
      ).resolves.not.toThrow();
    });

    it('should handle errors in recording command execution', async () => {
      const command = 'generateReport';
      const executionTime = 123;
      const success = false;
      const errorMessage = 'Execution recording failed';

      jest.spyOn(analyticsService, 'recordCommandExecution').mockRejectedValue(new Error(errorMessage));

      await expect(
        analyticsService.recordCommandExecution(command, executionTime, success)
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics data in JSON format successfully', async () => {
      const format = 'json';
      const exportPath = '/path/to/export.json';

      jest.spyOn(analyticsService, 'exportAnalytics').mockResolvedValue(exportPath);

      const result = await analyticsService.exportAnalytics(format);
      expect(result).toBe(exportPath);
    });

    it('should handle errors in exporting analytics data', async () => {
      const format = 'csv';
      const errorMessage = 'Export failed';

      jest.spyOn(analyticsService, 'exportAnalytics').mockRejectedValue(new Error(errorMessage));

      await expect(analyticsService.exportAnalytics(format)).rejects.toThrow(errorMessage);
    });
  });

  // Add more tests for other methods...
});
```

### Key Points:
- **Setup/Teardown**: Using `beforeEach` and `afterEach` ensures that each test has a clean setup and teardown, clearing any mock state after each test.
- **Mocking**: External dependency calls are mocked using `jest.spyOn`