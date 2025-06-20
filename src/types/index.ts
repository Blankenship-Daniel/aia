// Export new SOLID interfaces for Week 3 optimizations
export * from '../interfaces/ICachingService';
export * from '../interfaces/IPerformanceMonitor';

// Core application types
export interface AIAConfig {
  preferredModel: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  autoExecute: boolean;
  plugins: Record<string, PluginConfig>;
  profiles: Record<string, ConfigProfile>;
  // Output directory settings for prompt generation
  outputDirectories?: {
    prompts?: string;
    copilotInstructions?: string;
    context?: string;
    architecture?: string;
    comprehensive?: string;
    minimal?: string;
    developer?: string;
  };
}

export interface ConfigProfile {
  name: string;
  description: string;
  settings: Partial<AIAConfig>;
  active: boolean;
}

export interface PluginConfig {
  enabled: boolean;
  version: string;
  settings: Record<string, unknown>;
}

export type AIModel =
  // OpenAI models
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  // Claude 4 series (latest)
  | 'claude-opus-4-20250514'
  | 'claude-sonnet-4-20250514'
  // Claude 3.5 series
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  // Claude 3 series (legacy)
  | 'claude-3-opus-20240229'
  | 'claude-3-haiku-20240307'
  // Legacy aliases (for backward compatibility)
  | 'claude-3.5-sonnet'
  | 'claude-3-haiku';

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
  output?: string;
}

export interface CommandOptions {
  model?: AIModel;
  context?: string;
  verbose?: boolean;
  autoExecute?: boolean;
  [key: string]: unknown;
}

export interface CommandOption {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: unknown;
}

export type AsyncResult<T> = Promise<{
  success: boolean;
  data?: T;
  error?: string;
}>;

export type ServiceResult<T> = { success: boolean; data?: T; error?: string };

export interface MemoryEntry {
  query: string;
  response: string;
  timestamp: string;
  context: Record<string, unknown>;
  semanticTags: string[];
  confidence: number;
}

export interface MemoryData {
  conversations: MemoryEntry[];
  commands: CommandHistoryEntry[];
  preferences: Record<string, unknown>;
  workingDirectories: Record<string, Record<string, unknown>>;
  semanticIndex: Record<string, unknown>;
  agenticHistory: AgenticGoal[];
}

export interface Conversation {
  query: string;
  response: string;
  timestamp: string;
  context: ContextInfo;
  semanticTags: string[];
  confidence: number;
}

export interface CommandHistory {
  command: string;
  timestamp: string;
  workingDirectory: string;
  exitCode: number;
  duration: number;
  optimized: boolean;
}

export interface CommandHistoryEntry {
  command: string;
  timestamp: string;
  workingDirectory: string;
  exitCode: number;
  duration: number;
  optimized: boolean;
}

export interface ContextInfo {
  workingDirectory: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  user: string;
  shell: string;
  timestamp: string;
  projectType: string;
  projectInfo: Record<string, unknown>;
  gitStatus: string;
  environmentScore: number;
  performanceMetrics?: Record<string, unknown>;
  securityStatus?: Record<string, unknown>;
  pluginContext?: Record<string, unknown>;
}

export interface AgenticGoal {
  goal: string;
  plan: AgenticStep[];
  executionResults: AgenticExecutionResult[];
  learnings: string[];
  timestamp: string;
}

export interface AgenticStep {
  id?: string; // Add optional id field to preserve step IDs
  description: string;
  command: string; // Make required to match ExecutionStep
  expectedOutcome: string;
  reasoning: string;
  risks: string[]; // Make required to match ExecutionStep
  dependencies: string[]; // Make required to match ExecutionStep
}

export interface AgenticExecutionResult {
  step: AgenticStep;
  success: boolean;
  output: string;
  error?: string;
  confidence: number;
}

export interface AgenticExecution {
  id: string;
  goal: string;
  plan: AgenticStep[];
  results: AgenticExecutionResult[];
  executionResults: AgenticExecutionResult[]; // Alias for backward compatibility
  status: 'pending' | 'running' | 'completed' | 'failed';
  iterations: number;
  startTime: string;
  endTime?: string;
  learnings: string[];
  context: ContextInfo;
  success?: boolean; // Computed based on results
  confidence?: number; // Computed confidence score
  timestamp?: string; // Alias for startTime
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  hooks?: string[];
  commands?: PluginCommand[];
  dependencies?: Record<string, string>;
  permissions?: string[];
  license?: string;
  keywords?: string[];
  aia?: {
    version: string;
    [key: string]: unknown;
  };
}

export interface PluginCommand {
  name: string;
  description: string;
  usage: string;
  options?: PluginCommandOption[];
}

export interface PluginCommandOption {
  flag: string;
  description: string;
  required?: boolean;
  type: 'string' | 'boolean' | 'number';
}

export interface WorkflowStep {
  command: string;
  description?: string;
  expectedOutput?: string;
  timestamp: string;
}

export interface Workflow {
  name: string;
  description: string;
  author: string;
  tags: string[];
  steps: WorkflowStep[];
  createdAt: string;
  lastExecuted?: string;
}

// Error handling types
export interface ErrorContext {
  operation: string;
  component: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  execute: () => Promise<boolean>;
}

// Performance and security types
export interface PerformanceMetrics {
  memoryUsage: number;
  responseTime: number;
  cacheHitRate: number;
  [key: string]: unknown;
}

export interface SecurityStatus {
  threats: string[];
  lastScan: string;
  riskLevel: 'low' | 'medium' | 'high';
  [key: string]: unknown;
}

// Plugin system types
export interface PluginPermission {
  type: 'filesystem' | 'network' | 'command' | 'memory';
  scope: string;
  description: string;
}

export interface PluginHook {
  name: string;
  type: 'beforeCommand' | 'afterCommand' | 'beforeAIQuery' | 'afterAIQuery';
  handler: string;
}

export interface Plugin {
  manifest: PluginManifest;
  initialize: (config: Record<string, unknown>) => Promise<void>;
  executeCommand: (
    commandName: string,
    args: string[],
    options: Record<string, unknown>
  ) => Promise<CommandResult>;
  executeHook: (
    hookName: string,
    context: Record<string, unknown>
  ) => Promise<void>;
  cleanup: () => Promise<void>;
}

// Plugin system types
export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: Record<string, string>;
  commands: PluginCommand[];
  permissions: string[];
  loaded: boolean;
  enabled: boolean;
  manifest: PluginManifest;
}

export interface PluginInstallOptions {
  name?: string;
  version?: string;
  source?: string;
  force?: boolean;
  dryRun?: boolean;
}

export interface PluginUninstallOptions {
  force?: boolean;
  purge?: boolean;
}

export interface PluginListFilters {
  enabled?: boolean;
  loaded?: boolean;
  author?: string;
}

export interface PluginSearchOptions {
  limit?: number;
  category?: string;
  sort?: 'name' | 'popularity' | 'updated';
}

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PluginStats {
  totalPlugins: number;
  enabledPlugins: number;
  loadedPlugins: number;
  hooks: number;
}

export interface PluginCommandResult {
  plugin: string;
  command: string;
  args: string[];
  result: string;
  exitCode: number;
}

export interface HookContext {
  [key: string]: unknown;
}

export interface HookResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Workflow types
export interface WorkflowExecutionContext {
  variables: Record<string, unknown>;
  currentStep: number;
  startTime: string;
  executionId: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  stepsExecuted: number;
  totalSteps: number;
  output: string[];
  errors: string[];
  duration: number;
}

// Agentic reasoning types
export interface ExecutionStep {
  id?: string;
  command: string;
  description: string;
  expectedOutcome: string;
  reasoning?: string; // Make reasoning optional to be compatible with AgenticStep
  risks: string[];
  dependencies: string[];
  timeout?: number; // Add timeout support
}

export interface ExecutionResult {
  step: ExecutionStep;
  success: boolean;
  output: string;
  error?: string;
  confidence: number;
  timestamp: string;
}

export interface LearningEntry {
  pattern: string;
  outcome: 'success' | 'failure';
  context: Record<string, unknown>;
  recommendation: string;
  confidence: number;
  timestamp: string;
}

// Search and analysis types
export interface SearchResult {
  relevance: number;
  content: string;
  source: string;
  context: Record<string, unknown>;
}

export interface SemanticAnalysis {
  sentiment: number;
  intent: string;
  entities: string[];
  confidence: number;
  domain: string;
}

// Configuration types for different components
export interface ModelConfiguration {
  temperature: number;
  maxTokens: number;
  timeout: number;
  retries: number;
}

export interface CacheConfiguration {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'lfu';
}

export interface CommandContext {
  workingDirectory: string;
  environment: Record<string, string>;
  args: string[];
  options: Record<string, unknown>;
  session?: {
    id: string;
    timestamp: string;
  };
}

// NLP and Agentic Reasoning types
export interface NLPAnalysis {
  intent: {
    intent: string;
    subType?: string;
    confidence: number;
  };
  goalType: 'SIMPLE' | 'COMPLEX' | 'MULTI_STEP';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  enhancedGoal: string;
  entities: Record<string, string[]>;
  suggestedRefinements: string[];
}

export interface AgenticPlan {
  id: string;
  description: string;
  confidence: number;
  steps: AgenticPlanStep[];
  reasoning: string;
  fallbackOptions: string[];
}

export interface AgenticPlanStep {
  id: string;
  description: string;
  type: 'SEARCH' | 'COMMAND' | 'ANALYSIS' | 'OTHER';
  command?: string;
  query?: string;
  critical: boolean;
  expectedOutput: string;
}

export interface EvaluationResult {
  goalAchieved: boolean;
  confidence: number;
  reason: string;
  shouldContinue: boolean;
  suggestedImprovements?: string[];
  partialSuccess?: boolean;
  nextSteps?: string[];
  result?: ExecutionResult;
}

export interface RecoveryResult {
  canRecover: boolean;
  strategy: string;
  steps: string[];
  reason: string;
  adjustedGoal?: string;
  timeoutRecommendation?: string;
}

export interface AgenticContext {
  goal: string;
  enhancedGoal: string;
  nlpAnalysis: NLPAnalysis;
  iterations: number;
  maxIterations: number;
  currentPlan?: AgenticPlan;
  executionHistory: ExecutionResult[];
}

// Extended ExecutionResult for agentic reasoning
export interface AgenticExecutionResult extends ExecutionResult {
  planId?: string;
  stepId?: string;
  steps?: StepResult[];
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output: string;
  error?: string;
  timestamp: string;
}

// Analytics types for Phase 2 UX Enhancements
export interface CommandUsage {
  command: string;
  count: number;
  averageTime: number;
  successRate: number;
  lastUsed: Date;
}

export interface TimeDistribution {
  hourly: Record<string, number>;
  daily: Record<string, number>;
  weekly: Record<string, number>;
  peakHours: number[];
  mostProductiveTime: string;
}

export interface FeatureUsage {
  feature: string;
  usageCount: number;
  adoptionDate: Date;
  frequency: 'low' | 'medium' | 'high';
  category: string;
}

export interface ErrorPattern {
  errorType: string;
  frequency: number;
  commands: string[];
  commonCauses: string[];
  lastOccurrence: Date;
}

// SOLID-compliant Memory Service Interfaces
export { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
export { IConversationMemory } from '../interfaces/IConversationMemory';
export { ICommandMemory } from '../interfaces/ICommandMemory';
export { IMemoryStatistics } from '../interfaces/IMemoryStatistics';
export { IMemoryImportExport } from '../interfaces/IMemoryImportExport';
export { IAgenticMemory } from '../interfaces/IAgenticMemory';
export { IPreferences } from '../interfaces/IPreferences';
export { IWorkingDirectory } from '../interfaces/IWorkingDirectory';
