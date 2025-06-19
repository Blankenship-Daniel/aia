import { AIModel } from './types/index.js';

interface ModelPerformanceStats {
  totalQueries: number;
  category: string;
}

interface QueryClassification {
  [key: string]: number;
}

interface ContextWeights {
  projectType: number;
  gitStatus: number;
  workingDirectory: number;
  recentCommands: number;
}

interface ModelContext {
  projectType?: string;
  gitStatus?: string;
  workingDirectory: string;
  recentCommands?: string[];
}

interface UserPreferences {
  preferredModel: AIModel;
}

// AI Model Selection Enhancement
// This module will contain advanced heuristics for selecting the optimal AI model
class ModelSelector {
  private modelPerformance: Map<string, ModelPerformanceStats>;
  private queryPatterns: Record<string, RegExp>;

  constructor() {
    this.modelPerformance = new Map();
    this.queryPatterns = {
      coding:
        /\b(code|programming|debug|function|class|algorithm|syntax|error|bug)\b/i,
      analysis:
        /\b(analyze|research|explain|understand|why|how|what|when|where)\b/i,
      creativity:
        /\b(create|generate|design|write|compose|imagine|brainstorm)\b/i,
      technical:
        /\b(install|deploy|configure|setup|optimize|performance|security)\b/i,
      documentation: /\b(document|readme|guide|tutorial|instructions|help)\b/i,
    };
  }

  // Enhanced model selection based on multiple factors
  selectOptimalModel(
    query: string,
    context: ModelContext,
    userPreferences: UserPreferences,
    availableModels: AIModel[]
  ): AIModel {
    try {
      const queryType = this.classifyQuery(query);
      const contextWeight = this.analyzeContext(context);

      // Start with user's preferred model if available
      const preferredModel = userPreferences.preferredModel || 'gpt-4';
      let bestModel: AIModel = preferredModel;
      let bestScore = 0;

      // Give the preferred model a base score so it has a chance to win
      const preferredModelInAvailable = availableModels.find(
        (model) =>
          model === preferredModel ||
          model.includes(preferredModel.split('-')[0])
      );

      if (preferredModelInAvailable) {
        bestScore = 0.5; // Base score for user preference
        bestModel = preferredModelInAvailable;
      }

      // Analyze query type for model selection
      const analysisScore = queryType.analysis || 0;
      const codingScore = queryType.coding || 0;
      const creativityScore = queryType.creativity || 0;

      for (const model of availableModels) {
        let score = 0;

        // Start with user preference bonus if this is the preferred model
        if (
          model === preferredModel ||
          model.includes(preferredModel.split('-')[0])
        ) {
          score += 0.5; // User preference bonus
        }

        // Claude is better for analysis and research
        if (model.includes('claude') && analysisScore > 0) {
          score += analysisScore * 0.8;
        }

        // GPT-4 is better for coding and technical tasks
        if (model.includes('gpt-4') && codingScore > 0) {
          score += codingScore * 0.9;
        }

        // GPT-3.5 is good for general tasks
        if (model.includes('gpt-3.5')) {
          score += 0.3; // Reduced from 0.6 to not override user preference
        }

        if (score > bestScore) {
          bestScore = score;
          bestModel = model;
        }
      }

      return bestModel;
    } catch (error) {
      // Fallback to preferred model
      return userPreferences.preferredModel || 'gpt-4';
    }
  }

  private classifyQuery(query: string): QueryClassification {
    const classifications: QueryClassification = {};

    for (const [type, pattern] of Object.entries(this.queryPatterns)) {
      const matches = query.match(pattern);
      classifications[type] = matches ? matches.length : 0;
    }

    return classifications;
  }

  private analyzeContext(context: ModelContext): ContextWeights {
    const weights: ContextWeights = {
      projectType: this.getProjectTypeWeight(context.projectType),
      gitStatus: this.getGitStatusWeight(context.gitStatus),
      workingDirectory: this.getDirectoryWeight(context.workingDirectory),
      recentCommands: this.getCommandHistoryWeight(context.recentCommands),
    };

    return weights;
  }

  // Performance tracking for model selection optimization
  trackModelUsage(model: AIModel, query: string): void {
    const key = `${model}-${this.getQueryCategory(query)}`;

    if (!this.modelPerformance.has(key)) {
      this.modelPerformance.set(key, {
        totalQueries: 0,
        category: this.getQueryCategory(query),
      });
    }

    const stats = this.modelPerformance.get(key)!;
    stats.totalQueries++;
    this.modelPerformance.set(key, stats);
  }

  // Helper methods
  private getProjectTypeWeight(projectType?: string): number {
    const weights: Record<string, number> = {
      'package.json': 0.8, // Node.js project
      'requirements.txt': 0.7, // Python project
      'Cargo.toml': 0.6, // Rust project
      'go.mod': 0.6, // Go project
    };
    return weights[projectType || ''] || 0.5;
  }

  private getGitStatusWeight(gitStatus?: string): number {
    if (!gitStatus) return 0.5;
    const modifiedFiles = gitStatus.split('\n').length;
    return Math.min(modifiedFiles / 10, 1.0);
  }

  private getDirectoryWeight(workingDirectory: string): number {
    // Simple scoring based on directory depth
    const depth = workingDirectory.split('/').length;
    return Math.min(depth / 10, 1.0);
  }

  private getCommandHistoryWeight(commands?: string[]): number {
    if (!commands || !Array.isArray(commands)) return 0.5;
    return Math.min(commands.length / 20, 1.0);
  }

  private getQueryCategory(query: string): string {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('code') || queryLower.includes('debug'))
      return 'coding';
    if (queryLower.includes('analyze') || queryLower.includes('explain'))
      return 'analysis';
    if (queryLower.includes('create') || queryLower.includes('generate'))
      return 'creativity';
    return 'general';
  }
}

export default ModelSelector;
