/**
 * AI-Powered Task Complexity Analyzer
 * Requires AI service for classification - no programmatic fallbacks
 */

import { AITaskClassifier } from './AITaskClassifier';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
import { TaskAnalysis } from './TaskComplexityAnalyzer';

export class EnhancedTaskComplexityAnalyzer {
  private aiClassifier: AITaskClassifier;

  constructor(aiService: IAIService, contextService: IContextService) {
    if (!aiService) {
      throw new Error(
        '🚨 AI service is required for AIA CLI. Please configure your API keys using "aia config"'
      );
    }

    if (!contextService) {
      throw new Error('🚨 Context service is required for task analysis.');
    }

    this.aiClassifier = new AITaskClassifier(aiService, contextService);
  }

  /**
   * Analyze a task using AI-based classification only
   * Throws error if AI is unavailable - no fallbacks
   */
  async analyzeTask(taskDescription: string): Promise<TaskAnalysis> {
    try {
      return await this.aiClassifier.classifyTask(taskDescription);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Provide helpful error messages based on error type
      if (
        errorMessage.includes('authentication') ||
        errorMessage.includes('401')
      ) {
        throw new Error(
          '🚨 AI API authentication failed. Please check your API keys:\n' +
            '   Run: aia config --set openaiApiKey=your_key\n' +
            '   Or:  aia config --set anthropicApiKey=your_key'
        );
      }

      if (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout')
      ) {
        throw new Error(
          '🚨 AI service network error. Please check your internet connection and try again.'
        );
      }

      throw new Error(
        `🚨 AI classification failed: ${errorMessage}\n` +
          '   AIA CLI requires AI reasoning to function. Please ensure your AI service is properly configured.'
      );
    }
  }
}
