// Enhanced Context Analysis Module
// Provides deep project understanding and environmental awareness

import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IContextService } from './interfaces/IContextService.js';
import { ContextInfo, AsyncResult } from './types/index.js';

const execAsync = promisify(exec);

interface ProjectAnalyzer {
  (filePath: string): Promise<ProjectAnalysis>;
}

interface ProjectAnalysis {
  dependencies: string[];
  devDependencies?: string[];
  scripts?: Record<string, string>;
  type: string;
  recommendations: string[];
  version?: string;
  [key: string]: unknown;
}

interface DeepAnalysis {
  projectStructure: ProjectStructure | { error: string };
  dependencies: DependencyAnalysis | { error: string };
  codeMetrics: CodeMetrics | { error: string };
  developmentEnvironment: DevelopmentEnvironment;
  securityStatus: SecurityStatus;
  performance: PerformanceAnalysis;
}

interface ProjectStructure {
  totalFiles: number;
  directories: string[];
  fileTypes: Record<string, number>;
  largestFiles: string[];
  configFiles: string[];
  [key: string]: unknown;
}

interface DependencyAnalysis {
  total: number;
  outdated: string[];
  vulnerable: string[];
  unused: string[];
  recommendations: string[];
}

interface CodeMetrics {
  linesOfCode: number;
  complexity: number;
  duplicateCode: number;
  testCoverage: number;
}

interface DevelopmentEnvironment {
  ide: string[];
  tools: string[];
  cicd: string[];
  containers: string[];
}

interface SecurityStatus {
  sensitiveFiles: string[];
  exposedSecrets: string[];
  permissions: Record<string, string>;
  recommendations: string[];
}

interface PerformanceAnalysis {
  bundleSize: string | number;
  buildTime: string | number;
  recommendations: string[];
}

interface FileSymbol {
  name: string;
  type: string;
  line: number;
}

interface SearchIndex {
  symbols: Map<
    string,
    Array<{
      file: string;
      type: string;
      line: number;
    }>
  >;
  content: Map<
    string,
    {
      content: string;
      tokens: string[];
      summary: string;
    }
  >;
  tags: Map<string, unknown>;
}

interface APIStructure {
  classes: string[];
  functions: string[];
  exports: string[];
  endpoints: string[];
}

/**
 * ContextAnalyzer class
 * 
 * TODO: Add class description
 */
export class ContextAnalyzer implements IContextService {
  private projectAnalyzers: Record<string, ProjectAnalyzer>;

  /**
   * Creates an instance of the class
   */
  constructor() {
    this.projectAnalyzers = {
      'package.json': this.analyzeNodeProject.bind(this),
      'requirements.txt': this.analyzePythonProject.bind(this),
      'Cargo.toml': this.analyzeRustProject.bind(this),
      'go.mod': this.analyzeGoProject.bind(this),
      'pom.xml': this.analyzeJavaProject.bind(this),
    };
  }

  /**
   * Initializes the operation
   * 
   * @returns Promise<void> - Return value description
   */
  public async initialize(): Promise<void> {
    // Initialize context service
    // No specific initialization needed for this implementation
  }

  /**
   * Handles gatherContext operation
   * 
   * @returns Promise<ContextInfo> - Return value description
   */
  public async gatherContext(): Promise<ContextInfo> {
    const workingDirectory = process.cwd();
    const platform = process.platform;
    const arch = process.arch;
    const nodeVersion = process.version;
    const user = process.env.USER || process.env.USERNAME || 'unknown';
    const shell = process.env.SHELL || 'unknown';
    const timestamp = new Date().toISOString();

    // Analyze project
    const projectAnalysis = await this.analyzeProject(workingDirectory);

    return {
      workingDirectory,
      platform,
      arch,
      nodeVersion,
      user,
      shell,
      timestamp,
      projectType: projectAnalysis.projectType,
      projectInfo: projectAnalysis.structure,
      gitStatus: 'unknown', // Implement git status detection
      environmentScore: this.calculateEnvironmentScore({
        workingDirectory,
        platform,
        projectType: projectAnalysis.projectType,
      }),
      performanceMetrics: {},
      securityStatus: {},
      pluginContext: {},
    };
  }

  /**
   * Analyzes project
   * 
   * @param directory? - Parameter description
   * 
   * @returns Promise< - Return value description
   */
  public async analyzeProject(directory?: string): Promise<{
    projectType: string;
    dependencies: Record<string, string>;
    structure: Record<string, unknown>;
    vulnerabilities: Array<{
      severity: string;
      description: string;
    }>;
  }> {
    const workingDir = directory || process.cwd();
    const analysis = await this.performDeepAnalysis(workingDir);

    return {
      projectType: 'unknown', // Implement project type detection
      dependencies: {},
      structure: analysis.projectStructure,
      vulnerabilities: [],
    };
  }

  /**
   * Gets gitstatus
   * 
   * @param directory? - Parameter description
   * 
   * @returns Promise< - Return value description
   */
  public async getGitStatus(directory?: string): Promise<{
    branch: string;
    status: string;
    commits: number;
    modified: string[];
    staged: string[];
  }> {
    // Implement git status detection
    return {
      branch: 'unknown',
      status: 'unknown',
      commits: 0,
      modified: [],
      staged: [],
    };
  }

  /**
   * Handles detectProjectType operation
   * 
   * @param directory? - Parameter description
   * 
   * @returns Promise< - Return value description
   */
  public async detectProjectType(directory?: string): Promise<{
    type: string;
    confidence: number;
    indicators: string[];
  }> {
    // Implement project type detection
    return {
      type: 'unknown',
      confidence: 0,
      indicators: [],
    };
  }

  /**
   * Gets environmentmetrics
   * 
   * @returns Promise< - Return value description
   */
  public async getEnvironmentMetrics(): Promise<{
    memory: { used: number; free: number; total: number };
    cpu: { usage: number; cores: number };
    disk: { used: number; free: number; total: number };
    platform: string;
    nodeVersion: string;
  }> {
    const os = require('os');

    return {
      memory: {
        used: os.totalmem() - os.freemem(),
        free: os.freemem(),
        total: os.totalmem(),
      },
      cpu: {
        usage: 0, // Implement CPU usage detection
        cores: os.cpus().length,
      },
      disk: {
        used: 0, // Implement disk usage detection
        free: 0,
        total: 0,
      },
      platform: os.platform(),
      nodeVersion: process.version,
    };
  }

  /**
   * Handles scoreContext operation
   * 
   * @param context - Parameter description
   * 
   * @returns  - Return value description
   */
  public scoreContext(context: ContextInfo): {
    score: number;
    factors: Record<string, number>;
    recommendations: string[];
  } {
    const factors: Record<string, number> = {};
    let score = 0.5; // Base score

    if (context.projectType) {
      factors.projectType = 0.2;
      score += 0.2;
    }

    if (context.gitStatus !== 'unknown') {
      factors.gitStatus = 0.1;
      score += 0.1;
    }

    if (context.platform === 'darwin') {
      factors.platform = 0.1;
      score += 0.1; // macOS optimization
    }

    const finalScore = Math.min(score, 1.0);

    return {
      score: finalScore,
      factors,
      recommendations: this.generateContextRecommendations(context),
    };
  }

  public async analyzeEnvironment(
    basicContext: Record<string, unknown>
  ): Promise<{
    deepAnalysis: DeepAnalysis;
    environmentScore: number;
    recommendations: string[];
  }> {
    try {
      const workingDirectory =
        (basicContext.workingDirectory as string) || process.cwd();
      const analysis = await this.performDeepAnalysis(workingDirectory);

      return {
        deepAnalysis: analysis,
        environmentScore: this.calculateEnvironmentScore(basicContext),
        recommendations: this.generateRecommendations(analysis),
      };
    } catch (error) {
      console.warn(
        'Context analysis failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        deepAnalysis: {
          projectStructure: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          dependencies: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          codeMetrics: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          developmentEnvironment: {
            ide: [],
            tools: [],
            cicd: [],
            containers: [],
          },
          securityStatus: {
            sensitiveFiles: [],
            exposedSecrets: [],
            permissions: {},
            recommendations: [],
          },
          performance: {
            bundleSize: 'unknown',
            buildTime: 'unknown',
            recommendations: [],
          },
        },
        environmentScore: 0.5,
        recommendations: [],
      };
    }
  }

  /**
   * Calculates environmentscore
   * 
   * @param context - Parameter description
   * @param unknown> - Parameter description
   * 
   * @returns number - Return value description
   */
  private calculateEnvironmentScore(context: Record<string, unknown>): number {
    let score = 0.5; // Base score

    if (context.projectType) score += 0.2;
    if (context.gitStatus) score += 0.1;
    if (context.platform === 'darwin') score += 0.1; // macOS optimization

    return Math.min(score, 1.0);
  }

  /**
   * Generates recommendations
   * 
   * @param analysis - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private generateRecommendations(analysis: DeepAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.dependencies && 'recommendations' in analysis.dependencies) {
      recommendations.push(...analysis.dependencies.recommendations);
    }

    return recommendations;
  }

  /**
   * Generates contextrecommendations
   * 
   * @param context - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private generateContextRecommendations(context: ContextInfo): string[] {
    const recommendations: string[] = [];

    if (context.environmentScore < 0.7) {
      recommendations.push('Consider improving development environment setup');
    }

    if (context.projectType === 'unknown') {
      recommendations.push(
        'Project type could not be determined - consider adding configuration files'
      );
    }

    return recommendations;
  }

  private async performDeepAnalysis(
    workingDirectory: string
  ): Promise<DeepAnalysis> {
    const analysis: DeepAnalysis = {
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

  private async analyzeProjectStructure(
    directory: string
  ): Promise<ProjectStructure | { error: string }> {
    try {
      const structure: ProjectStructure = {
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
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async analyzeDependencies(
    directory: string
  ): Promise<DependencyAnalysis | { error: string }> {
    try {
      const dependencies: DependencyAnalysis = {
        total: 0,
        outdated: [],
        vulnerable: [],
        unused: [],
        recommendations: [],
      };

      // Check for various project files
      for (const [filename, analyzer] of Object.entries(
        this.projectAnalyzers
      )) {
        const filePath = path.join(directory, filename);
        if (await fs.pathExists(filePath)) {
          const analysis = await analyzer(filePath);
          dependencies.total += analysis.dependencies?.length || 0;
          dependencies.recommendations.push(...analysis.recommendations);
        }
      }

      return dependencies;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async analyzeCodeMetrics(
    directory: string
  ): Promise<CodeMetrics | { error: string }> {
    try {
      const metrics: CodeMetrics = {
        linesOfCode: 0,
        complexity: 0,
        duplicateCode: 0,
        testCoverage: 0,
      };

      const codeFiles = await this.getCodeFiles(directory);
      for (const file of codeFiles) {
        const content = await fs.readFile(file, 'utf8');
        metrics.linesOfCode += content.split('\n').length;
      }

      return metrics;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async analyzeDevelopmentEnvironment(
    directory: string
  ): Promise<DevelopmentEnvironment> {
    const environment: DevelopmentEnvironment = {
      ide: await this.detectIDE(directory),
      tools: await this.detectDevelopmentTools(directory),
      cicd: await this.detectCICD(directory),
      containers: await this.detectContainers(directory),
    };

    return environment;
  }

  private async analyzeSecurityStatus(
    directory: string
  ): Promise<SecurityStatus> {
    const security: SecurityStatus = {
      sensitiveFiles: await this.findSensitiveFiles(directory),
      exposedSecrets: await this.scanForSecrets(directory),
      permissions: await this.checkPermissions(directory),
      recommendations: [],
    };

    return security;
  }

  private async analyzePerformance(
    directory: string
  ): Promise<PerformanceAnalysis> {
    const performance: PerformanceAnalysis = {
      bundleSize: 'unknown',
      buildTime: 'unknown',
      recommendations: [],
    };

    // Add performance analysis logic here

    return performance;
  }

  // Project-specific analyzers
  private async analyzeNodeProject(
    packageJsonPath: string
  ): Promise<ProjectAnalysis> {
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});

      const analysis: ProjectAnalysis = {
        dependencies,
        devDependencies,
        scripts: packageJson.scripts || {},
        type: 'node',
        version: packageJson.version,
        recommendations: this.generateNodeRecommendations(packageJson),
      };

      return analysis;
    } catch (error) {
      return {
        dependencies: [],
        type: 'node',
        recommendations: [
          `Error analyzing package.json: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
      };
    }
  }

  private async analyzePythonProject(
    requirementsPath: string
  ): Promise<ProjectAnalysis> {
    try {
      const content = await fs.readFile(requirementsPath, 'utf8');
      const dependencies = content
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) =>
          line.split('==')[0].split('>=')[0].split('<=')[0].trim()
        );

      return {
        dependencies,
        type: 'python',
        recommendations: this.generatePythonRecommendations(dependencies),
      };
    } catch (error) {
      return {
        dependencies: [],
        type: 'python',
        recommendations: [
          `Error analyzing requirements.txt: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
      };
    }
  }

  private async analyzeRustProject(
    cargoPath: string
  ): Promise<ProjectAnalysis> {
    try {
      const content = await fs.readFile(cargoPath, 'utf8');
      // Basic TOML parsing - in production, use a proper TOML parser
      const dependencies: string[] = [];

      const dependenciesSection = content.match(
        /\[dependencies\](.*?)(?=\[|$)/s
      );
      if (dependenciesSection) {
        const deps = dependenciesSection[1].match(/^(\w+)/gm);
        if (deps) {
          dependencies.push(...deps);
        }
      }

      return {
        dependencies,
        type: 'rust',
        recommendations: this.generateRustRecommendations(dependencies),
      };
    } catch (error) {
      return {
        dependencies: [],
        type: 'rust',
        recommendations: [
          `Error analyzing Cargo.toml: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
      };
    }
  }

  /**
   * Analyzes goproject
   * 
   * @param goModPath - Parameter description
   * 
   * @returns Promise<ProjectAnalysis> - Return value description
   */
  private async analyzeGoProject(goModPath: string): Promise<ProjectAnalysis> {
    try {
      const content = await fs.readFile(goModPath, 'utf8');
      const dependencies: string[] = [];

      const requireBlock = content.match(/require \((.*?)\)/s);
      if (requireBlock) {
        const deps = requireBlock[1]
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('//'))
          .map((line) => line.split(' ')[0]);
        dependencies.push(...deps);
      }

      return {
        dependencies,
        type: 'go',
        recommendations: this.generateGoRecommendations(dependencies),
      };
    } catch (error) {
      return {
        dependencies: [],
        type: 'go',
        recommendations: [
          `Error analyzing go.mod: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
      };
    }
  }

  /**
   * Analyzes javaproject
   * 
   * @param pomPath - Parameter description
   * 
   * @returns Promise<ProjectAnalysis> - Return value description
   */
  private async analyzeJavaProject(pomPath: string): Promise<ProjectAnalysis> {
    try {
      const content = await fs.readFile(pomPath, 'utf8');
      const dependencies: string[] = [];

      // Basic XML parsing - in production, use a proper XML parser
      const dependencyMatches = content.match(
        /<artifactId>(.*?)<\/artifactId>/g
      );
      if (dependencyMatches) {
        dependencies.push(
          ...dependencyMatches.map((match) =>
            match.replace(/<artifactId>|<\/artifactId>/g, '')
          )
        );
      }

      return {
        dependencies,
        type: 'java',
        recommendations: this.generateJavaRecommendations(dependencies),
      };
    } catch (error) {
      return {
        dependencies: [],
        type: 'java',
        recommendations: [
          `Error analyzing pom.xml: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
      };
    }
  }

  // Helper methods
  /**
   * Gets filelist
   * 
   * @param directory - Parameter description
   * 
   * @returns Promise<string[]> - Return value description
   */
  private async getFileList(directory: string): Promise<string[]> {
    const files: string[] = [];

    async function walkDir(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip common directories that shouldn't be analyzed
          if (
            !['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(
              entry.name
            )
          ) {
            await walkDir(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    }

    await walkDir(directory);
    return files;
  }

  /**
   * Gets codefiles
   * 
   * @param directory - Parameter description
   * 
   * @returns Promise<string[]> - Return value description
   */
  private async getCodeFiles(directory: string): Promise<string[]> {
    const allFiles = await this.getFileList(directory);
    const codeExtensions = [
      '.js',
      '.ts',
      '.py',
      '.rs',
      '.go',
      '.java',
      '.cpp',
      '.c',
      '.h',
    ];

    return allFiles.filter((file) =>
      codeExtensions.includes(path.extname(file).toLowerCase())
    );
  }

  /**
   * Handles isConfigFile operation
   * 
   * @param filename - Parameter description
   * 
   * @returns boolean - Return value description
   */
  private isConfigFile(filename: string): boolean {
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'webpack.config.js',
      'babel.config.js',
      'jest.config.js',
      '.eslintrc',
      '.prettierrc',
      'Dockerfile',
      'docker-compose.yml',
      'requirements.txt',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
    ];

    const basename = path.basename(filename);
    return configFiles.includes(basename) || basename.startsWith('.env');
  }

  /**
   * Handles detectIDE operation
   * 
   * @param directory - Parameter description
   * 
   * @returns Promise<string[]> - Return value description
   */
  private async detectIDE(directory: string): Promise<string[]> {
    const ides: string[] = [];

    if (await fs.pathExists(path.join(directory, '.vscode'))) {
      ides.push('vscode');
    }
    if (await fs.pathExists(path.join(directory, '.idea'))) {
      ides.push('intellij');
    }

    return ides;
  }

  /**
   * Handles detectDevelopmentTools operation
   * 
   * @param directory - Parameter description
   * 
   * @returns Promise<string[]> - Return value description
   */
  private async detectDevelopmentTools(directory: string): Promise<string[]> {
    const tools: string[] = [];

    if (await fs.pathExists(path.join(directory, 'package.json'))) {
      tools.push('npm');
    }
    if (await fs.pathExists(path.join(directory, 'yarn.lock'))) {
      tools.push('yarn');
    }
    if (await fs.pathExists(path.join(directory, 'Pipfile'))) {
      tools.push('pipenv');
    }

    return tools;
  }

  /**
   * Handles detectCICD operation
   * 
   * @param directory - Parameter description
   * 
   * @returns Promise<string[]> - Return value description
   */
  private async detectCICD(directory: string): Promise<string[]> {
    const cicd: string[] = [];

    if (await fs.pathExists(path.join(directory, '.github', 'workflows'))) {
      cicd.push('github-actions');
    }
    if (await fs.pathExists(path.join(directory, '.gitlab-ci.yml'))) {
      cicd.push('gitlab-ci');
    }
    if (await fs.pathExists(path.join(directory, 'Jenkinsfile'))) {
      cicd.push('jenkins');
    }

    return cicd;
  }

  /**
   * Handles detectContainers operation
   * 
   * @param directory - Parameter description
   * 
   * @returns Promise<string[]> - Return value description
   */
  private async detectContainers(directory: string): Promise<string[]> {
    const containers: string[] = [];

    if (await fs.pathExists(path.join(directory, 'Dockerfile'))) {
      containers.push('docker');
    }
    if (await fs.pathExists(path.join(directory, 'docker-compose.yml'))) {
      containers.push('docker-compose');
    }

    return containers;
  }

  /**
   * Handles findSensitiveFiles operation
   * 
   * @param directory - Parameter description
   * 
   * @returns Promise<string[]> - Return value description
   */
  private async findSensitiveFiles(directory: string): Promise<string[]> {
    const sensitivePatterns = [
      '.env',
      '.key',
      '.pem',
      '.p12',
      'id_rsa',
      'id_dsa',
    ];
    const allFiles = await this.getFileList(directory);

    return allFiles.filter((file) => {
      const basename = path.basename(file);
      return sensitivePatterns.some((pattern) => basename.includes(pattern));
    });
  }

  /**
   * Handles scanForSecrets operation
   * 
   * @param directory - Parameter description
   * 
   * @returns Promise<string[]> - Return value description
   */
  private async scanForSecrets(directory: string): Promise<string[]> {
    // Basic secret scanning - in production, use dedicated tools
    const secrets: string[] = [];
    const secretPatterns = [
      /api[_-]?key/i,
      /secret[_-]?key/i,
      /password/i,
      /token/i,
    ];

    const codeFiles = await this.getCodeFiles(directory);

    for (const file of codeFiles.slice(0, 50)) {
      // Limit for performance
      try {
        const content = await fs.readFile(file, 'utf8');
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            secrets.push(
              `Potential secret in ${path.relative(directory, file)}`
            );
            break;
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return secrets;
  }

  private async checkPermissions(
    directory: string
  ): Promise<Record<string, string>> {
    const permissions: Record<string, string> = {};

    try {
      const stats = await fs.stat(directory);
      permissions.directory = stats.mode.toString(8);
    } catch {
      permissions.directory = 'unknown';
    }

    return permissions;
  }

  // Recommendation generators
  private generateNodeRecommendations(
    packageJson: Record<string, unknown>
  ): string[] {
    const recommendations: string[] = [];

    if (!packageJson.scripts || Object.keys(packageJson.scripts).length === 0) {
      recommendations.push('Consider adding npm scripts for common tasks');
    }

    if (!packageJson.engines) {
      recommendations.push(
        'Consider specifying Node.js version in engines field'
      );
    }

    return recommendations;
  }

  /**
   * Generates pythonrecommendations
   * 
   * @param dependencies - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private generatePythonRecommendations(dependencies: string[]): string[] {
    const recommendations: string[] = [];

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

  /**
   * Generates rustrecommendations
   * 
   * @param dependencies - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private generateRustRecommendations(dependencies: string[]): string[] {
    const recommendations: string[] = [];

    if (dependencies.length === 0) {
      recommendations.push('Consider adding dependencies to Cargo.toml');
    }

    return recommendations;
  }

  /**
   * Generates gorecommendations
   * 
   * @param dependencies - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private generateGoRecommendations(dependencies: string[]): string[] {
    const recommendations: string[] = [];

    if (dependencies.length === 0) {
      recommendations.push('Consider adding dependencies to go.mod');
    }

    return recommendations;
  }

  /**
   * Generates javarecommendations
   * 
   * @param dependencies - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private generateJavaRecommendations(dependencies: string[]): string[] {
    const recommendations: string[] = [];

    if (dependencies.length === 0) {
      recommendations.push('Consider adding dependencies to pom.xml');
    }

    return recommendations;
  }
}
