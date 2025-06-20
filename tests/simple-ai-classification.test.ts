/**
 * Simple integration test to verify AI task classification works
 */

import { EnhancedTaskComplexityAnalyzer } from '../src/services/EnhancedTaskComplexityAnalyzer';
import { TaskType } from '../src/services/TaskComplexityAnalyzer';

// Mock AI Service
const mockAIService = {
  async queryAI(): Promise<any> {
    return {
      content: JSON.stringify({
        taskType: 'ANALYSIS',
        complexity: 'MODERATE',
        riskLevel: 'LOW',
        confidence: 0.95,
        reasoning: 'This is a test classification',
        requiredCapabilities: ['FILE_READING'],
      }),
      model: 'gpt-4',
      metadata: {},
    };
  },
} as any;

// Mock Context Service
const mockContextService = {
  async gatherContext(): Promise<any> {
    return {
      workingDirectory: '/test',
      platform: 'darwin',
      arch: 'x64',
      nodeVersion: 'v18.0.0',
      user: 'test',
      shell: 'zsh',
      timestamp: new Date().toISOString(),
      projectType: 'typescript',
      projectInfo: {},
      gitStatus: 'clean',
      environmentScore: 0.85,
      language: 'typescript', // Add language field expected by classifier
    };
  },
} as any;

describe('Simple AI Task Classification Test', () => {
  test('should create enhanced analyzer and classify task', async () => {
    const analyzer = new EnhancedTaskComplexityAnalyzer(
      mockAIService,
      mockContextService
    );

    const result = await analyzer.analyzeTask('Create a markdown summary');

    console.log('Classification result:', result);
    expect(result.type).toBeDefined();
    // Check that the result has the expected structure
  });
});
