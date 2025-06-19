/**
 * Context Service Implementation
 * Manages context analysis and environment awareness
 */
import { IContextService } from '../interfaces/IContextService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { ContextInfo } from '../types/index';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export class ContextService implements IContextService {
  private configService: IConfigurationService;
  private cache: Map<string, unknown> = new Map();
  private initialized: boolean = false;

  constructor(configurationService: IConfigurationService) {
    this.configService = configurationService;
  }

  /**
   * Initialize context service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('ContextService initialized');
  }

  /**
   * Gather comprehensive context information
   */
  async gatherContext(): Promise<ContextInfo> {
    const cacheKey = `context_${process.cwd()}_${Date.now()}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as ContextInfo;
    }

    const context: ContextInfo = {
      workingDirectory: process.cwd(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      user: process.env.USER || process.env.USERNAME || 'unknown',
      shell: process.env.SHELL || 'unknown',
      timestamp: new Date().toISOString(),
      projectType: 'unknown',
      projectInfo: {},
      gitStatus: '',
      environmentScore: 0,
    };

    // Analyze project type
    const projectAnalysis = await this.analyzeProject();
    context.projectType = projectAnalysis.projectType;
    context.projectInfo = {
      dependencies: projectAnalysis.dependencies,
      structure: projectAnalysis.structure,
    };

    // Get git status
    try {
      const gitStatus = await this.getGitStatus();
      context.gitStatus = gitStatus.status;
    } catch (error) {
      context.gitStatus = 'No git repository';
    }

    // Calculate environment score
    context.environmentScore = this.calculateEnvironmentScore(context);

    // Cache for short period
    this.cache.set(cacheKey, context);
    setTimeout(() => this.cache.delete(cacheKey), 30000); // 30 seconds

    return context;
  }

  /**
   * Analyze project structure and dependencies
   */
  async analyzeProject(directory?: string): Promise<{
    projectType: string;
    dependencies: Record<string, string>;
    structure: Record<string, unknown>;
    vulnerabilities: Array<{
      severity: string;
      description: string;
    }>;
  }> {
    const targetDir = directory || process.cwd();
    const result = {
      projectType: 'unknown',
      dependencies: {} as Record<string, string>,
      structure: {} as Record<string, unknown>,
      vulnerabilities: [] as Array<{ severity: string; description: string }>,
    };

    try {
      // Check for package.json (Node.js project)
      const packageJsonPath = path.join(targetDir, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        result.projectType = 'node';
        const packageJson = await fs.readJson(packageJsonPath);
        result.dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
      }

      // Check for requirements.txt (Python project)
      const requirementsPath = path.join(targetDir, 'requirements.txt');
      if (await fs.pathExists(requirementsPath)) {
        result.projectType =
          result.projectType === 'unknown' ? 'python' : 'mixed';
      }

      // Check for Cargo.toml (Rust project)
      const cargoPath = path.join(targetDir, 'Cargo.toml');
      if (await fs.pathExists(cargoPath)) {
        result.projectType =
          result.projectType === 'unknown' ? 'rust' : 'mixed';
      }

      // Analyze directory structure
      const files = await fs.readdir(targetDir);
      result.structure = {
        fileCount: files.length,
        hasTests: files.some((f) => f.includes('test') || f.includes('spec')),
        hasConfig: files.some(
          (f) => f.includes('config') || f.includes('.env')
        ),
        hasDocs: files.some(
          (f) => f.toLowerCase() === 'readme.md' || f.includes('doc')
        ),
      };
    } catch (error) {
      console.warn('Project analysis failed:', (error as Error).message);
    }

    return result;
  }

  /**
   * Get git repository status
   */
  async getGitStatus(directory?: string): Promise<{
    branch: string;
    status: string;
    commits: number;
    modified: string[];
    staged: string[];
  }> {
    const { spawn } = await import('child_process');
    const targetDir = directory || process.cwd();

    return new Promise((resolve, reject) => {
      const git = spawn('git', ['status', '--porcelain', '--branch'], {
        cwd: targetDir, // @ts-ignore
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      git.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      git.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      git.on('close', (code: number | null) => {
        if (code !== 0) {
          reject(new Error(`Git command failed: ${stderr}`));
          return;
        }

        const lines = stdout.trim().split('\n');
        const branchLine = lines[0] || '';
        const branch =
          branchLine.match(/## (.+?)(?:\.\.\.|$)/)?.[1] || 'unknown';

        const modified: string[] = [];
        const staged: string[] = [];

        lines.slice(1).forEach((line) => {
          const status = line.substring(0, 2);
          const file = line.substring(3);

          if (status[0] !== ' ') staged.push(file);
          if (status[1] !== ' ') modified.push(file);
        });

        resolve({
          branch,
          status: lines.length > 1 ? 'modified' : 'clean',
          commits: 0, // Would need additional git command to get this
          modified,
          staged,
        });
      });

      git.on('error', (error: Error) => {
        reject(new Error(`Git status failed: ${error.message}`));
      });
    });
  }

  /**
   * Detect project type from directory structure
   */
  async detectProjectType(directory?: string): Promise<{
    type: string;
    confidence: number;
    indicators: string[];
  }> {
    const targetDir = directory || process.cwd();
    const indicators: string[] = [];
    let type = 'unknown';
    let confidence = 0;

    try {
      const files = await fs.readdir(targetDir);

      // Node.js indicators
      if (files.includes('package.json')) {
        type = 'node';
        confidence += 0.8;
        indicators.push('package.json');
      }
      if (files.includes('node_modules')) {
        confidence += 0.1;
        indicators.push('node_modules');
      }

      // Python indicators
      if (files.includes('requirements.txt')) {
        type = type === 'unknown' ? 'python' : 'mixed';
        confidence += 0.7;
        indicators.push('requirements.txt');
      }
      if (files.includes('setup.py')) {
        confidence += 0.1;
        indicators.push('setup.py');
      }

      // Rust indicators
      if (files.includes('Cargo.toml')) {
        type = type === 'unknown' ? 'rust' : 'mixed';
        confidence += 0.8;
        indicators.push('Cargo.toml');
      }
    } catch (error) {
      console.warn('Project type detection failed:', (error as Error).message);
    }

    return {
      type,
      confidence: Math.min(confidence, 1.0),
      indicators,
    };
  }

  /**
   * Get environment metrics and performance data
   */
  async getEnvironmentMetrics(): Promise<{
    memory: { used: number; free: number; total: number };
    cpu: { usage: number; cores: number };
    disk: { used: number; free: number; total: number };
    platform: string;
    nodeVersion: string;
  }> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      memory: {
        used: usedMem,
        free: freeMem,
        total: totalMem,
      },
      cpu: {
        usage: 0, // Would need more sophisticated CPU monitoring
        cores: os.cpus().length,
      },
      disk: {
        used: 0, // Would need disk usage calculation
        free: 0,
        total: 0,
      },
      platform: process.platform,
      nodeVersion: process.version,
    };
  }

  /**
   * Score context relevance for AI processing
   */
  scoreContext(context: ContextInfo): {
    score: number;
    factors: Record<string, number>;
    recommendations: string[];
  } {
    const factors: Record<string, number> = {};
    const recommendations: string[] = [];
    let score = 0;

    // Project type relevance
    if (context.projectType !== 'unknown') {
      factors.projectType = 0.3;
      score += 0.3;
    } else {
      recommendations.push('Consider adding project configuration files');
    }

    // Git status relevance
    if (context.gitStatus === 'clean') {
      factors.gitStatus = 0.2;
      score += 0.2;
    } else if (context.gitStatus === 'modified') {
      factors.gitStatus = 0.1;
      score += 0.1;
      recommendations.push('Consider committing your changes');
    }

    // Environment completeness
    if (context.nodeVersion) {
      factors.environment = 0.1;
      score += 0.1;
    }

    return {
      score: Math.min(score, 1.0),
      factors,
      recommendations,
    };
  }

  /**
   * Calculate overall environment score
   */
  private calculateEnvironmentScore(context: ContextInfo): number {
    let score = 0;

    // Base environment (always present)
    score += 0.3;

    // Project type detection
    if (context.projectType !== 'unknown') {
      score += 0.3;
    }

    // Git repository
    if (context.gitStatus !== 'No git repository') {
      score += 0.2;
    }

    // Development tools
    if (context.nodeVersion) {
      score += 0.1;
    }

    // Shell environment
    if (context.shell !== 'unknown') {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }
}
