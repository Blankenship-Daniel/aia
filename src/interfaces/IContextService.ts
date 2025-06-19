import { ContextInfo } from '../types/index';

/**
 * Context Service Interface
 * Defines the contract for context analysis and environment awareness
 */
export interface IContextService {
  /**
   * Initialize context service
   */
  initialize(): Promise<void>;

  /**
   * Gather comprehensive context information
   */
  gatherContext(): Promise<ContextInfo>;

  /**
   * Analyze project structure and dependencies
   */
  analyzeProject(directory?: string): Promise<{
    projectType: string;
    dependencies: Record<string, string>;
    structure: Record<string, unknown>;
    vulnerabilities: Array<{
      severity: string;
      description: string;
    }>;
  }>;

  /**
   * Get git repository status
   */
  getGitStatus(directory?: string): Promise<{
    branch: string;
    status: string;
    commits: number;
    modified: string[];
    staged: string[];
  }>;

  /**
   * Detect project type from directory structure
   */
  detectProjectType(directory?: string): Promise<{
    type: string;
    confidence: number;
    indicators: string[];
  }>;

  /**
   * Get environment metrics and performance data
   */
  getEnvironmentMetrics(): Promise<{
    memory: { used: number; free: number; total: number };
    cpu: { usage: number; cores: number };
    disk: { used: number; free: number; total: number };
    platform: string;
    nodeVersion: string;
  }>;

  /**
   * Score context relevance for AI processing
   */
  scoreContext(context: ContextInfo): {
    score: number;
    factors: Record<string, number>;
    recommendations: string[];
  };
}
