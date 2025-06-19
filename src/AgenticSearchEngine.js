const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

/**
 * AgenticSearchEngine - Enhanced search and information discovery for agentic reasoning
 * This engine helps the AgenticReasoningEngine gather relevant information,
 * search through memory, and discover contextual data to improve decision making.
 */
class AgenticSearchEngine {
  constructor(aia) {
    this.aia = aia;
    this.searchCache = new Map();
    this.contextCache = new Map();
  }

  /**
   * Enhanced context search for agentic reasoning
   * @param {string} goal - The goal we're trying to achieve
   * @param {object} context - Current execution context
   * @returns {object} Enhanced context information
   */
  async gatherRelevantContext(goal, context = {}) {
    console.log(chalk.blue('🔍 Gathering relevant context...'));

    const relevantContext = {
      memoryInsights: await this.searchMemoryForGoal(goal),
      projectContext: await this.analyzeProjectForGoal(goal),
      environmentContext: await this.analyzeEnvironment(goal),
      historicalPatterns: await this.findHistoricalPatterns(goal),
      suggestedResources: await this.suggestRelevantResources(goal),
    };

    return relevantContext;
  }

  /**
   * Search through memory for relevant information related to the goal
   */
  async searchMemoryForGoal(goal) {
    try {
      // Safely get memory data
      let memory = {};
      try {
        if (this.aia.loadMemory && typeof this.aia.loadMemory === 'function') {
          memory = await this.aia.loadMemory();
        } else if (this.aia.memory) {
          memory = this.aia.memory;
        } else {
          memory = { conversations: [], commands: [] };
        }
      } catch (memoryError) {
        console.log(
          chalk.yellow(`⚠️ Memory loading failed: ${memoryError.message}`)
        );
        memory = { conversations: [], commands: [] };
      }

      // Ensure memory has safe defaults
      if (!memory.conversations || !Array.isArray(memory.conversations)) {
        memory.conversations = [];
      }
      if (!memory.commands || !Array.isArray(memory.commands)) {
        memory.commands = [];
      }

      // Search conversations for similar goals or related content
      let relatedConversations = [];
      try {
        // Try new service-based search first
        if (this.aia.memoryService && this.aia.memoryService.searchMemory) {
          const searchResults = await this.aia.memoryService.searchMemory(
            goal,
            5,
            'conversation'
          );
          relatedConversations = searchResults.map((result) => result.content);
        } else if (
          this.aia.memoryManager &&
          this.aia.memoryManager.semanticSearch
        ) {
          // Fallback to legacy semantic search
          const searchResults = await this.aia.memoryManager.semanticSearch(
            goal,
            5
          );
          relatedConversations = searchResults
            .filter((result) => result.type === 'conversation')
            .map((result) => result.content);
        } else {
          // Fallback to simple text search
          relatedConversations = memory.conversations
            .filter((conv) => {
              if (!conv || !conv.query) return false;
              return this.calculateRelevance(conv.query, goal) > 0;
            })
            .slice(-5);
        }
      } catch (error) {
        console.log(
          chalk.yellow(`⚠️ Conversation search failed: ${error.message}`)
        );
        // Fallback to simple text search if semantic search fails
        relatedConversations = memory.conversations
          .filter((conv) => {
            if (!conv || !conv.query) return false;
            return this.calculateRelevance(conv.query, goal) > 0;
          })
          .slice(-5);
      }

      // Find relevant command patterns
      const relevantCommands = memory.commands
        .filter((cmd) => this.isCommandRelevantToGoal(cmd.command, goal))
        .slice(-10);

      // Extract insights from previous interactions
      const insights = this.extractInsightsFromMemory(
        relatedConversations,
        goal
      );

      return {
        conversations: relatedConversations,
        commands: relevantCommands,
        insights,
      };
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Memory search failed: ${error.message}`));
      return { conversations: [], commands: [], insights: [] };
    }
  }

  /**
   * Analyze current project structure for goal-relevant information
   */
  async analyzeProjectForGoal(goal) {
    try {
      let currentContext = {};
      try {
        currentContext = await this.aia.gatherContext();
      } catch (error) {
        console.log(
          chalk.yellow(`⚠️ Context gathering failed: ${error.message}`)
        );
        // Use basic context as fallback
        currentContext = {
          workingDirectory: process.cwd(),
          platform: process.platform,
          projectType: 'unknown',
        };
      }

      // Enhanced project analysis based on goal
      const projectInsights = {
        projectType: currentContext.projectType || 'unknown',
        workingDirectory: currentContext.workingDirectory || process.cwd(),
        relevantFiles: await this.findRelevantFiles(goal),
        dependencies: await this.analyzeDependencies(goal),
        configuration: await this.analyzeConfiguration(goal),
        gitContext: await this.analyzeGitContext(goal, currentContext),
      };

      return projectInsights;
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Project analysis failed: ${error.message}`));
      return {
        projectType: 'unknown',
        workingDirectory: process.cwd(),
        relevantFiles: [],
        dependencies: {},
        configuration: {},
        gitContext: {},
      };
    }
  }

  /**
   * Analyze environment for goal-specific requirements
   */
  async analyzeEnvironment(goal) {
    let environmentContext = {};
    try {
      environmentContext = await this.aia.gatherContext();
    } catch (error) {
      console.log(
        chalk.yellow(`⚠️ Environment analysis failed: ${error.message}`)
      );
      // Use basic environment as fallback
      environmentContext = {
        platform: process.platform,
        shell: process.env.SHELL || 'unknown',
        nodeVersion: process.version,
        workingDirectory: process.cwd(),
      };
    }

    return {
      platform: environmentContext.platform || process.platform,
      shell: environmentContext.shell || process.env.SHELL || 'unknown',
      nodeVersion: environmentContext.nodeVersion || process.version,
      workingDirectory: environmentContext.workingDirectory || process.cwd(),
      availableTools: this.detectAvailableTools(goal),
      systemCapabilities: this.assessSystemCapabilities(goal),
    };
  }

  /**
   * Find historical patterns that might be relevant to the current goal
   */
  async findHistoricalPatterns(goal) {
    try {
      // Safely get memory data
      let memory = {};
      try {
        if (this.aia.loadMemory && typeof this.aia.loadMemory === 'function') {
          memory = await this.aia.loadMemory();
        } else if (this.aia.memory) {
          memory = this.aia.memory;
        } else {
          memory = { conversations: [], commands: [] };
        }
      } catch (memoryError) {
        console.log(
          chalk.yellow(`⚠️ Memory loading failed: ${memoryError.message}`)
        );
        memory = { conversations: [], commands: [] };
      }

      // Ensure memory has the expected structure with safe defaults
      if (!memory.conversations || !Array.isArray(memory.conversations)) {
        memory.conversations = [];
      }
      if (!memory.commands || !Array.isArray(memory.commands)) {
        memory.commands = [];
      }

      // Analyze command patterns
      const commandPatterns = this.analyzeCommandPatterns(
        memory.commands,
        goal
      );

      // Analyze conversation patterns
      const conversationPatterns = this.analyzeConversationPatterns(
        memory.conversations,
        goal
      );

      return {
        commandPatterns,
        conversationPatterns,
        successPatterns: this.identifySuccessPatterns(memory, goal),
        failurePatterns: this.identifyFailurePatterns(memory, goal),
      };
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Pattern analysis failed: ${error.message}`));
      return {
        commandPatterns: {},
        conversationPatterns: {},
        successPatterns: [],
        failurePatterns: [],
      };
    }
  }

  /**
   * Suggest relevant resources or documentation based on the goal
   */
  async suggestRelevantResources(goal) {
    const resources = [];

    // Analyze goal keywords to suggest resources
    const goalKeywords = this.extractKeywords(goal);

    for (const keyword of goalKeywords) {
      if (this.isDevToolKeyword(keyword)) {
        resources.push({
          type: 'documentation',
          keyword,
          suggestion: `Consider checking ${keyword} documentation`,
        });
      }

      if (this.isLanguageKeyword(keyword)) {
        resources.push({
          type: 'language',
          keyword,
          suggestion: `${keyword} specific resources might be helpful`,
        });
      }
    }

    return resources;
  }

  /**
   * Find files in the project that might be relevant to the goal
   */
  async findRelevantFiles(goal) {
    const cwd = process.cwd();
    const relevantFiles = [];

    try {
      // Define file patterns that might be relevant based on goal keywords
      const goalKeywords = this.extractKeywords(goal.toLowerCase());
      const filePatterns = this.getFilePatterns(goalKeywords);

      for (const pattern of filePatterns) {
        const files = await this.findFilesByPattern(cwd, pattern);
        relevantFiles.push(...files);
      }

      return relevantFiles.slice(0, 20); // Limit to prevent overwhelming output
    } catch (error) {
      console.log(chalk.yellow(`⚠️ File search failed: ${error.message}`));
      return [];
    }
  }

  /**
   * Helper method to check if a command is relevant to a goal
   */
  isCommandRelevantToGoal(command, goal) {
    // Ensure both command and goal are strings before processing
    const safeGoal = String(goal || '').toLowerCase();
    const safeCommand = String(command || '').toLowerCase();

    const goalKeywords = this.extractKeywords(safeGoal);
    const commandKeywords = this.extractKeywords(safeCommand);

    return goalKeywords.some((keyword) =>
      commandKeywords.some(
        (cmdKeyword) =>
          cmdKeyword.includes(keyword) || keyword.includes(cmdKeyword)
      )
    );
  }

  /**
   * Extract insights from memory conversations
   */
  extractInsightsFromMemory(conversations, goal) {
    const insights = [];

    for (const conv of conversations) {
      if (
        (conv.response && conv.response.includes('solution')) ||
        conv.response.includes('success')
      ) {
        insights.push({
          type: 'success_pattern',
          query: conv.query,
          insight: 'Previous successful approach found',
        });
      }

      if (
        conv.response &&
        (conv.response.includes('error') || conv.response.includes('failed'))
      ) {
        insights.push({
          type: 'failure_pattern',
          query: conv.query,
          insight: 'Previous failure to avoid',
        });
      }
    }

    return insights;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .filter(
        (word) =>
          ![
            'the',
            'and',
            'for',
            'are',
            'but',
            'not',
            'you',
            'all',
            'can',
            'had',
            'her',
            'was',
            'one',
            'our',
            'out',
            'day',
            'get',
            'has',
            'him',
            'his',
            'how',
            'man',
            'new',
            'now',
            'old',
            'see',
            'two',
            'way',
            'who',
            'boy',
            'did',
            'its',
            'let',
            'put',
            'say',
            'she',
            'too',
            'use',
          ].includes(word)
      );
  }

  /**
   * Check if keyword is related to development tools
   */
  isDevToolKeyword(keyword) {
    const devTools = [
      'git',
      'npm',
      'node',
      'docker',
      'webpack',
      'babel',
      'eslint',
      'jest',
      'react',
      'vue',
      'angular',
      'typescript',
      'javascript',
      'python',
      'java',
      'go',
      'rust',
    ];
    return devTools.includes(keyword.toLowerCase());
  }

  /**
   * Check if keyword is related to programming languages
   */
  isLanguageKeyword(keyword) {
    const languages = [
      'javascript',
      'typescript',
      'python',
      'java',
      'cpp',
      'csharp',
      'go',
      'rust',
      'php',
      'ruby',
      'swift',
      'kotlin',
    ];
    return languages.includes(keyword.toLowerCase());
  }

  /**
   * Get file patterns to search for based on keywords
   */
  getFilePatterns(keywords) {
    const patterns = [];

    for (const keyword of keywords) {
      // Add direct filename matches
      patterns.push(`**/*${keyword}*`);

      // Add extension-based patterns
      if (['js', 'javascript'].includes(keyword)) {
        patterns.push('**/*.js', '**/*.mjs', '**/*.jsx');
      }
      if (['ts', 'typescript'].includes(keyword)) {
        patterns.push('**/*.ts', '**/*.tsx');
      }
      if (['py', 'python'].includes(keyword)) {
        patterns.push('**/*.py');
      }
      if (['test', 'testing'].includes(keyword)) {
        patterns.push('**/*.test.*', '**/*.spec.*', '**/test/**/*');
      }
      if (['config', 'configuration'].includes(keyword)) {
        patterns.push('**/*.config.*', '**/.config/**/*', '**/config/**/*');
      }
    }

    return [...new Set(patterns)]; // Remove duplicates
  }

  /**
   * Find files by pattern (simplified implementation)
   */
  async findFilesByPattern(dir, pattern) {
    const files = [];

    try {
      const items = await fs.readdir(dir);

      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = await fs.stat(itemPath);

        if (
          stat.isDirectory() &&
          !item.startsWith('.') &&
          item !== 'node_modules'
        ) {
          // Recursively search subdirectories (limited depth)
          const subFiles = await this.findFilesByPattern(itemPath, pattern);
          files.push(...subFiles);
        } else if (stat.isFile()) {
          // Simple pattern matching (can be enhanced with proper glob)
          if (this.matchesPattern(item, pattern)) {
            files.push(itemPath);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors and continue
    }

    return files;
  }

  /**
   * Simple pattern matching (can be enhanced with proper glob library)
   */
  matchesPattern(filename, pattern) {
    // Remove ** and * for simple matching
    const simplePattern = pattern.replace(/\*\*/g, '').replace(/\*/g, '');
    return filename.toLowerCase().includes(simplePattern.toLowerCase());
  }

  /**
   * Analyze dependencies for goal relevance
   */
  async analyzeDependencies(goal) {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        const goalKeywords = this.extractKeywords(goal.toLowerCase());
        const relevantDeps = Object.keys(allDeps).filter((dep) =>
          goalKeywords.some((keyword) => dep.toLowerCase().includes(keyword))
        );

        return { allDeps, relevantDeps };
      }
    } catch (error) {
      // Ignore errors
    }

    return {};
  }

  /**
   * Analyze configuration files for goal relevance
   */
  async analyzeConfiguration(goal) {
    const configFiles = [];
    const commonConfigs = [
      '.env',
      '.env.local',
      'config.json',
      '.config.json',
      'tsconfig.json',
      'webpack.config.js',
      '.eslintrc.js',
    ];

    for (const configFile of commonConfigs) {
      const filePath = path.join(process.cwd(), configFile);
      if (await fs.pathExists(filePath)) {
        configFiles.push(configFile);
      }
    }

    return { configFiles };
  }

  /**
   * Analyze git context for goal relevance
   */
  async analyzeGitContext(goal, currentContext = null) {
    try {
      let context = currentContext;
      if (!context) {
        try {
          context = await this.aia.gatherContext();
        } catch (error) {
          console.log(
            chalk.yellow(`⚠️ Git context gathering failed: ${error.message}`)
          );
          return { gitStatus: 'unknown', branch: 'unknown', hasChanges: false };
        }
      }

      return {
        gitStatus: context.gitStatus || 'unknown',
        branch: context.gitBranch || 'unknown',
        hasChanges: context.gitStatus && context.gitStatus.includes('Changes'),
      };
    } catch (error) {
      return { gitStatus: 'unknown', branch: 'unknown', hasChanges: false };
    }
  }

  /**
   * Detect available tools that might be relevant to the goal
   */
  detectAvailableTools(goal) {
    const tools = [];
    const goalKeywords = this.extractKeywords(goal.toLowerCase());

    // Common development tools to check for
    const toolCommands = {
      git: 'git --version',
      node: 'node --version',
      npm: 'npm --version',
      docker: 'docker --version',
      python: 'python --version',
      java: 'java -version',
      go: 'go version',
    };

    for (const [tool, command] of Object.entries(toolCommands)) {
      if (goalKeywords.includes(tool)) {
        tools.push({ tool, available: true, checkCommand: command });
      }
    }

    return tools;
  }

  /**
   * Assess system capabilities for the goal
   */
  assessSystemCapabilities(goal) {
    const capabilities = {
      canExecuteCommands: true,
      hasFileSystemAccess: true,
      hasNetworkAccess: true,
      platform: process.platform,
      architecture: process.arch,
    };

    return capabilities;
  }

  /**
   * Analyze command patterns from memory
   */
  analyzeCommandPatterns(commands, goal) {
    const patterns = {};
    const goalKeywords = this.extractKeywords(goal.toLowerCase());

    for (const cmd of commands) {
      // Ensure cmd.command is a string before processing
      if (!cmd || !cmd.command || typeof cmd.command !== 'string') {
        continue; // Skip invalid command entries
      }

      const cmdKeywords = this.extractKeywords(cmd.command.toLowerCase());
      const relevance = goalKeywords.filter((keyword) =>
        cmdKeywords.some((cmdKeyword) => cmdKeyword.includes(keyword))
      ).length;

      if (relevance > 0) {
        const baseCommand = cmd.command.split(' ')[0];
        patterns[baseCommand] = (patterns[baseCommand] || 0) + relevance;
      }
    }

    return patterns;
  }

  /**
   * Analyze conversation patterns from memory
   */
  analyzeConversationPatterns(conversations, goal) {
    const patterns = {};
    const goalKeywords = this.extractKeywords(goal.toLowerCase());

    for (const conv of conversations) {
      // Ensure conv.query is a string before processing
      if (!conv || !conv.query || typeof conv.query !== 'string') {
        continue; // Skip invalid conversation entries
      }

      const queryKeywords = this.extractKeywords(conv.query.toLowerCase());
      const relevance = goalKeywords.filter((keyword) =>
        queryKeywords.some((qKeyword) => qKeyword.includes(keyword))
      ).length;

      if (relevance > 0) {
        patterns[conv.query.substring(0, 50)] = relevance;
      }
    }

    return patterns;
  }

  /**
   * Identify success patterns from memory
   */
  identifySuccessPatterns(memory, goal) {
    const successIndicators = [
      'success',
      'completed',
      'done',
      'working',
      'fixed',
      'solved',
    ];
    const patterns = [];

    for (const conv of memory.conversations) {
      // Ensure conv.response is a string before processing
      if (!conv || !conv.response || typeof conv.response !== 'string') {
        continue; // Skip invalid conversation entries
      }

      if (
        successIndicators.some((indicator) =>
          conv.response.toLowerCase().includes(indicator)
        )
      ) {
        patterns.push({
          query: conv.query,
          pattern: 'success',
          relevance: this.calculateRelevance(conv.query, goal),
        });
      }
    }

    return patterns
      .filter((p) => p.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Identify failure patterns from memory
   */
  identifyFailurePatterns(memory, goal) {
    const failureIndicators = [
      'error',
      'failed',
      'problem',
      'issue',
      'broken',
      'not working',
    ];
    const patterns = [];

    for (const conv of memory.conversations) {
      // Ensure conv.response is a string before processing
      if (!conv || !conv.response || typeof conv.response !== 'string') {
        continue; // Skip invalid conversation entries
      }

      if (
        failureIndicators.some((indicator) =>
          conv.response.toLowerCase().includes(indicator)
        )
      ) {
        patterns.push({
          query: conv.query,
          pattern: 'failure',
          relevance: this.calculateRelevance(conv.query, goal),
        });
      }
    }

    return patterns
      .filter((p) => p.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Calculate relevance score between two texts
   */
  calculateRelevance(text1, text2) {
    // Ensure both texts are strings before processing
    const safeText1 = String(text1 || '').toLowerCase();
    const safeText2 = String(text2 || '').toLowerCase();

    const keywords1 = this.extractKeywords(safeText1);
    const keywords2 = this.extractKeywords(safeText2);

    let score = 0;
    for (const keyword1 of keywords1) {
      for (const keyword2 of keywords2) {
        if (keyword1.includes(keyword2) || keyword2.includes(keyword1)) {
          score++;
        }
      }
    }

    return score;
  }
}

module.exports = AgenticSearchEngine;
