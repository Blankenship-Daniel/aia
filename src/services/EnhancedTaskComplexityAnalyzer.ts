/**
 * Enhanced Task Complexity Analyzer with AI Integration
 * Combines AI-based classification with programmatic fallbacks
 */

import { TaskComplexityAnalyzer as OriginalAnalyzer } from './TaskComplexityAnalyzer';
import { AITaskClassifier } from './AITaskClassifier';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
import { TaskAnalysis } from './TaskComplexityAnalyzer';

export class EnhancedTaskComplexityAnalyzer {
  private aiClassifier?: AITaskClassifier;
  private fallbackAnalyzer: OriginalAnalyzer;

  constructor(aiService?: IAIService, contextService?: IContextService) {
    this.fallbackAnalyzer = new OriginalAnalyzer();

    if (aiService && contextService) {
      this.aiClassifier = new AITaskClassifier(aiService, contextService);
    }
  }

  /**
   * Analyze a task using AI-first approach with programmatic fallback
   */
  async analyzeTask(taskDescription: string): Promise<TaskAnalysis> {
    // If AI classifier is available, try AI-based classification first
    if (this.aiClassifier) {
      try {
        return await this.aiClassifier.classifyTask(taskDescription);
      } catch (error) {
        console.log(
          '⚠️  AI classification failed, using programmatic fallback'
        );
      }
    }

    // Fall back to programmatic classification
    return this.fallbackAnalyzer.analyzeTask(taskDescription);
  }

  /**
   * Synchronous method for backwards compatibility
   */
  analyzeTaskSync(taskDescription: string): TaskAnalysis {
    return this.fallbackAnalyzer.analyzeTask(taskDescription);
  }
}
