// Enhanced Context Analysis Module
// Provides deep project understanding and environmental awareness

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

class ContextAnalyzer {
  constructor() {
    this.projectAnalyzers = {
      'package.json': this.analyzeNodeProject.bind(this),
      'requirements.txt': this.analyzePythonProject.bind(this),
      'Cargo.toml': this.analyzeRustProject.bind(this),
      'go.mod': this.analyzeGoProject.bind(this),
      'pom.xml': this.analyzeJavaProject.bind(this),
    };
  }

  async analyzeEnvironment(basicContext) {
    try {
      const analysis = await this.performDeepAnalysis(
        basicContext.workingDirectory
      );

      return {
        deepAnalysis: analysis,
        environmentScore: this.calculateEnvironmentScore(basicContext),
        recommendations: this.generateRecommendations(analysis),
      };
    } catch (error) {
      console.warn('Context analysis failed:', error.message);
      return {
        deepAnalysis: { error: error.message },
        environmentScore: 0.5,
        recommendations: [],
      };
    }
  }

  calculateEnvironmentScore(context) {
    let score = 0.5; // Base score

    if (context.projectType) score += 0.2;
    if (context.gitStatus) score += 0.1;
    if (context.platform === 'darwin') score += 0.1; // macOS optimization

    return Math.min(score, 1.0);
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.dependencies && analysis.dependencies.recommendations) {
      recommendations.push(...analysis.dependencies.recommendations);
    }

    return recommendations;
  }

  async performDeepAnalysis(workingDirectory) {
    const analysis = {
      projectStructure: await this.analyzeProjectStructure(workingDirectory),
      dependencies: await this.analyzeDependencies(workingDirectory),
      codeMetrics: await this.analyzeCodeMetrics(workingDirectory),
      developmentEnvironment: await this.analyzeDevelopmentEnvironment(
        workingDirectory
      ),
      securityStatus: await this.analyzeSecurityStatus(workingDirectory),
      performance: await this.analyzePerformance(workingDirectory),
    };

    return analysis;
  }

  async analyzeProjectStructure(directory) {
    try {
      const structure = {
        totalFiles: 0,
        directories: [],
        fileTypes: {},
        largestFiles: [],
        configFiles: [],
      };

      const files = await this.getFileList(directory);
      structure.totalFiles = files.length;

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;

        // Identify config files
        if (this.isConfigFile(file)) {
          structure.configFiles.push(file);
        }
      }

      return structure;
    } catch (error) {
      return { error: error.message };
    }
  }

  async analyzeDependencies(directory) {
    const dependencies = {
      outdated: [],
      vulnerable: [],
      totalCount: 0,
      recommendations: [],
    };

    try {
      // Check for different project types
      const projectFiles = [
        'package.json',
        'requirements.txt',
        'Cargo.toml',
        'go.mod',
      ];

      for (const file of projectFiles) {
        const filePath = path.join(directory, file);
        if (await fs.pathExists(filePath)) {
          const analyzer = this.projectAnalyzers[file];
          if (analyzer) {
            const analysis = await analyzer(filePath);
            Object.assign(dependencies, analysis);
          }
        }
      }

      return dependencies;
    } catch (error) {
      return { error: error.message };
    }
  }

  async analyzeCodeMetrics(directory) {
    try {
      const metrics = {
        linesOfCode: 0,
        complexity: 'unknown',
        testCoverage: 'unknown',
        codeQuality: 'unknown',
      };

      // Basic line counting for different file types
      const codeFiles = await this.getCodeFiles(directory);
      for (const file of codeFiles) {
        const content = await fs.readFile(file, 'utf8');
        metrics.linesOfCode += content.split('\n').length;
      }

      return metrics;
    } catch (error) {
      return { error: error.message };
    }
  }

  async analyzeDevelopmentEnvironment(directory) {
    const environment = {
      ide: await this.detectIDE(directory),
      tools: await this.detectDevelopmentTools(directory),
      cicd: await this.detectCICD(directory),
      containers: await this.detectContainers(directory),
    };

    return environment;
  }

  async analyzeSecurityStatus(directory) {
    const security = {
      sensitiveFiles: await this.findSensitiveFiles(directory),
      exposedSecrets: await this.scanForSecrets(directory),
      permissions: await this.checkPermissions(directory),
      recommendations: [],
    };

    return security;
  }

  async analyzePerformance(directory) {
    const performance = {
      bundleSize: 'unknown',
      buildTime: 'unknown',
      recommendations: [],
    };

    // Add performance analysis logic here

    return performance;
  }

  // Project-specific analyzers
  async analyzeNodeProject(packageJsonPath) {
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});

      return {
        totalCount: dependencies.length + devDependencies.length,
        productionDeps: dependencies.length,
        developmentDeps: devDependencies.length,
        scripts: Object.keys(packageJson.scripts || {}),
        recommendations: this.getNodeRecommendations(packageJson),
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async analyzePythonProject(requirementsPath) {
    try {
      const content = await fs.readFile(requirementsPath, 'utf8');
      const dependencies = content
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'));

      return {
        totalCount: dependencies.length,
        recommendations: this.getPythonRecommendations(dependencies),
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async analyzeRustProject(cargoTomlPath) {
    // Implementation for Rust project analysis
    return { totalCount: 0, recommendations: [] };
  }

  async analyzeGoProject(goModPath) {
    // Implementation for Go project analysis
    return { totalCount: 0, recommendations: [] };
  }

  async analyzeJavaProject(pomXmlPath) {
    // Implementation for Java project analysis
    return { totalCount: 0, recommendations: [] };
  }

  async createCodebaseIndex(directory) {
    const index = {
      structure: await this.buildFileTree(directory),
      dependencies: await this.analyzeDependencyGraph(directory),
      apiSurface: await this.extractAPISurface(directory),
      documentation: await this.extractDocumentation(directory),
      testCoverage: await this.analyzeTestCoverage(directory),
      complexity: await this.calculateComplexity(directory),
      searchIndex: await this.buildSearchIndex(directory),
    };

    // Cache the index
    await this.cacheIndex(index, directory);

    return index;
  }

  async buildFileTree(directory) {
    const tree = {
      name: path.basename(directory),
      type: 'directory',
      children: [],
      metadata: {},
    };

    const items = await fs.readdir(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory() && !this.shouldIgnoreDirectory(item)) {
        tree.children.push(await this.buildFileTree(fullPath));
      } else if (stat.isFile()) {
        const fileInfo = {
          name: item,
          type: 'file',
          size: stat.size,
          modified: stat.mtime,
          language: this.detectLanguage(item),
          purpose: await this.detectFilePurpose(fullPath),
        };
        tree.children.push(fileInfo);
      }
    }

    return tree;
  }

  async extractAPISurface(directory) {
    const api = {
      classes: [],
      functions: [],
      exports: [],
      endpoints: [],
    };

    const files = await this.getCodeFiles(directory);

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const fileAPI = await this.parseFileAPI(content, file);

      api.classes.push(...fileAPI.classes);
      api.functions.push(...fileAPI.functions);
      api.exports.push(...fileAPI.exports);
      api.endpoints.push(...fileAPI.endpoints);
    }

    return api;
  }

  async buildSearchIndex(directory) {
    const searchIndex = {
      symbols: new Map(),
      content: new Map(),
      tags: new Map(),
    };

    const files = await this.getFileList(directory);

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const relativePath = path.relative(directory, file);

      // Index file content
      searchIndex.content.set(relativePath, {
        content: content.toLowerCase(),
        tokens: this.tokenize(content),
        summary: this.summarizeFile(content),
      });

      // Extract and index symbols
      const symbols = this.extractSymbols(content);
      symbols.forEach((symbol) => {
        if (!searchIndex.symbols.has(symbol.name)) {
          searchIndex.symbols.set(symbol.name, []);
        }
        searchIndex.symbols.get(symbol.name).push({
          file: relativePath,
          type: symbol.type,
          line: symbol.line,
        });
      });
    }

    return searchIndex;
  }

  // Helper methods
  async getFileList(directory) {
    const files = [];
    const items = await fs.readdir(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stats = await fs.stat(fullPath);

      if (stats.isFile()) {
        files.push(fullPath);
      } else if (stats.isDirectory() && !this.shouldIgnoreDirectory(item)) {
        const subFiles = await this.getFileList(fullPath);
        files.push(...subFiles);
      }
    }

    return files;
  }

  async getCodeFiles(directory) {
    const codeExtensions = [
      '.js',
      '.ts',
      '.py',
      '.rs',
      '.go',
      '.java',
      '.cpp',
      '.c',
      '.cs',
    ];
    const allFiles = await this.getFileList(directory);

    return allFiles.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return codeExtensions.includes(ext);
    });
  }

  isConfigFile(filePath) {
    const configFiles = [
      '.gitignore',
      '.env',
      '.env.example',
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'requirements.txt',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'webpack.config.js',
      'babel.config.js',
      'tsconfig.json',
      '.eslintrc.js',
    ];

    const fileName = path.basename(filePath);
    return (
      configFiles.includes(fileName) ||
      fileName.startsWith('.') ||
      fileName.endsWith('.config.js')
    );
  }

  shouldIgnoreDirectory(dirName) {
    const ignoredDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'target',
      '.vscode',
      '.idea',
    ];
    return ignoredDirs.includes(dirName);
  }

  async detectIDE(directory) {
    const ideMarkers = {
      '.vscode': 'Visual Studio Code',
      '.idea': 'IntelliJ IDEA',
      '*.sublime-project': 'Sublime Text',
      '.atom': 'Atom',
    };

    for (const [marker, ide] of Object.entries(ideMarkers)) {
      if (await fs.pathExists(path.join(directory, marker))) {
        return ide;
      }
    }

    return 'Unknown';
  }

  async detectDevelopmentTools(directory) {
    const tools = [];
    const toolMarkers = {
      'webpack.config.js': 'Webpack',
      'babel.config.js': 'Babel',
      'tsconfig.json': 'TypeScript',
      '.eslintrc.js': 'ESLint',
      'jest.config.js': 'Jest',
      Makefile: 'Make',
    };

    for (const [marker, tool] of Object.entries(toolMarkers)) {
      if (await fs.pathExists(path.join(directory, marker))) {
        tools.push(tool);
      }
    }

    return tools;
  }

  async detectCICD(directory) {
    const cicdMarkers = {
      '.github/workflows': 'GitHub Actions',
      '.gitlab-ci.yml': 'GitLab CI',
      Jenkinsfile: 'Jenkins',
      '.travis.yml': 'Travis CI',
      'azure-pipelines.yml': 'Azure Pipelines',
    };

    for (const [marker, cicd] of Object.entries(cicdMarkers)) {
      if (await fs.pathExists(path.join(directory, marker))) {
        return cicd;
      }
    }

    return 'None detected';
  }

  async detectContainers(directory) {
    const containerFiles = [
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',
    ];
    const detected = [];

    for (const file of containerFiles) {
      if (await fs.pathExists(path.join(directory, file))) {
        detected.push(file);
      }
    }

    return detected.length > 0 ? detected : ['None detected'];
  }

  async findSensitiveFiles(directory) {
    const sensitivePatterns = ['.env', '*.key', '*.pem', '*.p12', 'secrets.*'];
    const sensitiveFiles = [];

    // Implementation for finding sensitive files
    // This is a simplified version - you'd want more sophisticated pattern matching

    return sensitiveFiles;
  }

  async scanForSecrets(directory) {
    // Implementation for scanning exposed secrets
    // This would integrate with tools like git-secrets or similar
    return [];
  }

  async checkPermissions(directory) {
    // Implementation for checking file permissions
    return { status: 'unknown' };
  }

  getNodeRecommendations(packageJson) {
    const recommendations = [];

    // Check for common optimizations
    if (!packageJson.engines) {
      recommendations.push(
        'Consider specifying Node.js version in engines field'
      );
    }

    if (!packageJson.scripts || !packageJson.scripts.test) {
      recommendations.push('Add test script to package.json');
    }

    if (!packageJson.scripts || !packageJson.scripts.lint) {
      recommendations.push('Consider adding linting script');
    }

    return recommendations;
  }

  getPythonRecommendations(dependencies) {
    const recommendations = [];

    if (dependencies.length === 0) {
      recommendations.push(
        'Consider adding project dependencies to requirements.txt'
      );
    }

    // Check for common Python best practices
    const hasVersionPinning = dependencies.some((dep) => dep.includes('=='));
    if (!hasVersionPinning) {
      recommendations.push(
        'Consider pinning dependency versions for reproducible builds'
      );
    }

    return recommendations;
  }
}

module.exports = ContextAnalyzer;
