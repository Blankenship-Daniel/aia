// AI Model Selection Enhancement
// This module will contain advanced heuristics for selecting the optimal AI model

class ModelSelector {
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
  selectOptimalModel(query, context, userPreferences, availableModels) {
    try {
      const queryType = this.classifyQuery(query);
      const contextWeight = this.analyzeContext(context);

      // Start with user's preferred model if available
      const preferredModel = userPreferences.preferredModel || 'gpt-4';
      let bestModel = preferredModel;
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

  classifyQuery(query) {
    const classifications = {};

    for (const [type, pattern] of Object.entries(this.queryPatterns)) {
      const matches = query.match(pattern);
      classifications[type] = matches ? matches.length : 0;
    }

    return classifications;
  }

  analyzeContext(context) {
    const weights = {
      projectType: this.getProjectTypeWeight(context.projectType),
      gitStatus: this.getGitStatusWeight(context.gitStatus),
      workingDirectory: this.getDirectoryWeight(context.workingDirectory),
      recentCommands: this.getCommandHistoryWeight(context.recentCommands),
    };

    return weights;
  }

  // Performance tracking for model selection optimization
  trackModelUsage(model, query) {
    const key = `${model}-${this.getQueryCategory(query)}`;

    if (!this.modelPerformance.has(key)) {
      this.modelPerformance.set(key, {
        totalQueries: 0,
        category: this.getQueryCategory(query),
      });
    }

    const stats = this.modelPerformance.get(key);
    stats.totalQueries++;
    this.modelPerformance.set(key, stats);
  }

  // Helper methods
  getProjectTypeWeight(projectType) {
    const weights = {
      'package.json': 0.8, // Node.js project
      'requirements.txt': 0.7, // Python project
      'Cargo.toml': 0.6, // Rust project
      'go.mod': 0.6, // Go project
    };
    return weights[projectType] || 0.5;
  }

  getGitStatusWeight(gitStatus) {
    if (!gitStatus) return 0.5;
    const modifiedFiles = gitStatus.split('\n').length;
    return Math.min(modifiedFiles / 10, 1.0);
  }

  getDirectoryWeight(workingDirectory) {
    // Simple scoring based on directory depth
    const depth = workingDirectory.split('/').length;
    return Math.min(depth / 10, 1.0);
  }

  getCommandHistoryWeight(commands) {
    if (!commands || !Array.isArray(commands)) return 0.5;
    return Math.min(commands.length / 20, 1.0);
  }

  getQueryCategory(query) {
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

module.exports = ModelSelector;
