// Workflow Automation System
// Provides macro recording, conditional logic, and task automation

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { spawn, ChildProcess } from 'child_process';
import {
  Workflow,
  WorkflowStep,
  WorkflowExecutionContext,
  WorkflowExecutionResult,
  CommandResult,
  AsyncResult,
} from './types/index.js';

interface WorkflowMetadata {
  author: string;
  version: string;
  tags: string[];
}

interface RecordingSession {
  name: string;
  description: string;
  created: string;
  steps: WorkflowStep[];
  metadata: WorkflowMetadata;
}

interface WorkflowStartOptions {
  description?: string;
  author?: string;
  tags?: string[];
}

interface WorkflowExecutionOptions {
  variables?: Record<string, unknown>;
  dryRun?: boolean;
  verbose?: boolean;
  continueOnError?: boolean;
  startStep?: number;
  endStep?: number;
}

interface ExecutionContext {
  variables: Map<string, unknown>;
  lastResult: unknown;
  errors: string[];
}

interface WorkflowTrigger {
  type: 'time' | 'event' | 'file_change';
  pattern: string;
  workflowName: string;
  enabled: boolean;
}

interface ScheduledTask {
  id: string;
  workflowName: string;
  schedule: string;
  nextRun: string;
  enabled: boolean;
}

export class WorkflowManager {
  private workflowDirectory: string;
  private workflows: Map<string, Workflow>;
  private activeRecording: string | null;
  private recordingSession: RecordingSession | null;
  private triggers: Map<string, WorkflowTrigger>;
  private scheduledTasks: Map<string, ScheduledTask>;
  private executionContext: ExecutionContext;

  constructor(workflowDirectory: string) {
    this.workflowDirectory = workflowDirectory;
    this.workflows = new Map();
    this.activeRecording = null;
    this.recordingSession = null;
    this.triggers = new Map();
    this.scheduledTasks = new Map();

    // Workflow execution context
    this.executionContext = {
      variables: new Map(),
      lastResult: null,
      errors: [],
    };
  }

  // Initialize workflow system
  public async initialize(): Promise<void> {
    await fs.ensureDir(this.workflowDirectory);
    await this.loadWorkflows();
    await this.loadRecordingState();
    this.setupEventListeners();
    console.log(chalk.blue('🔄 Workflow automation system initialized'));
  }

  // Load all workflows from disk
  private async loadWorkflows(): Promise<void> {
    try {
      const workflowFiles = await fs.readdir(this.workflowDirectory);

      for (const file of workflowFiles) {
        if (file.endsWith('.workflow.json')) {
          const workflowPath = path.join(this.workflowDirectory, file);
          const workflow: Workflow = await fs.readJson(workflowPath);
          this.workflows.set(workflow.name, workflow);
        }
      }

      console.log(chalk.green(`📂 Loaded ${this.workflows.size} workflows`));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.warn(chalk.yellow('Workflow loading warning:', errorMessage));
    }
  }

  // Start recording a new workflow
  public async startRecording(
    workflowName: string,
    options: WorkflowStartOptions = {}
  ): Promise<AsyncResult<{ name: string }>> {
    if (this.activeRecording) {
      return {
        success: false,
        error: 'A workflow recording is already in progress',
      };
    }

    this.activeRecording = workflowName;
    this.recordingSession = {
      name: workflowName,
      description: options.description || `Recorded workflow: ${workflowName}`,
      created: new Date().toISOString(),
      steps: [],
      metadata: {
        author: options.author || 'AIA User',
        version: '1.0.0',
        tags: options.tags || [],
      },
    };

    // Save recording state
    await this.saveRecordingState();

    console.log(chalk.yellow(`🔴 Recording workflow: ${workflowName}`));
    console.log(
      chalk.gray(
        'Execute commands to record them. Use "aia workflow-stop-recording" to finish.'
      )
    );

    return { success: true, data: { name: workflowName } };
  }

  // Stop recording and save workflow
  public async stopRecording(): Promise<AsyncResult<Workflow>> {
    if (!this.activeRecording) {
      return {
        success: false,
        error: 'No workflow recording in progress',
      };
    }

    const workflowName = this.activeRecording;
    const workflow = this.recordingSession!;

    // Save workflow to disk
    const workflowPath = path.join(
      this.workflowDirectory,
      `${workflowName}.workflow.json`
    );
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });

    // Convert to proper Workflow format
    const finalWorkflow: Workflow = {
      name: workflow.name,
      description: workflow.description,
      author: workflow.metadata.author,
      tags: workflow.metadata.tags,
      steps: workflow.steps,
      createdAt: workflow.created,
    };

    // Add to in-memory collection
    this.workflows.set(workflowName, finalWorkflow);

    // Clear recording state
    this.activeRecording = null;
    this.recordingSession = null;
    await this.clearRecordingState();

    console.log(
      chalk.green(
        `✅ Workflow "${workflowName}" saved with ${finalWorkflow.steps.length} steps`
      )
    );

    return { success: true, data: finalWorkflow };
  }

  // Record a command execution step
  public recordStep(
    command: string,
    args: string[],
    context: Record<string, unknown>,
    result: CommandResult
  ): void {
    if (!this.activeRecording || !this.recordingSession) {
      return;
    }

    const step: WorkflowStep = {
      command: `${command} ${args.join(' ')}`.trim(),
      description: `Execute: ${command}`,
      expectedOutput: result.success ? 'Success' : 'Error',
      timestamp: new Date().toISOString(),
    };

    this.recordingSession.steps.push(step);
    console.log(chalk.gray(`📝 Recorded step: ${step.command}`));
  }

  // Record an AI query step
  public recordAIQuery(
    query: string,
    model: string,
    context: Record<string, unknown>,
    response: string
  ): void {
    if (!this.activeRecording || !this.recordingSession) {
      return;
    }

    const step: WorkflowStep = {
      command: `ai query "${query}" --model ${model}`,
      description: `AI Query: ${query.substring(0, 50)}...`,
      expectedOutput: response.substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
    };

    this.recordingSession.steps.push(step);
    console.log(
      chalk.gray(`📝 Recorded AI query: ${query.substring(0, 30)}...`)
    );
  }

  // Execute a workflow
  public async executeWorkflow(
    workflowName: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return {
        success: false,
        stepsExecuted: 0,
        totalSteps: 0,
        output: [],
        errors: [`Workflow "${workflowName}" not found`],
        duration: 0,
      };
    }

    const startTime = Date.now();
    const executionContext: WorkflowExecutionContext = {
      variables: options.variables || {},
      currentStep: options.startStep || 0,
      startTime: new Date().toISOString(),
      executionId: this.generateExecutionId(),
    };

    const result: WorkflowExecutionResult = {
      success: true,
      stepsExecuted: 0,
      totalSteps: workflow.steps.length,
      output: [],
      errors: [],
      duration: 0,
    };

    // Update workflow's last executed time
    workflow.lastExecuted = new Date().toISOString();

    console.log(chalk.blue(`🚀 Executing workflow: ${workflowName}`));

    const endStep = options.endStep || workflow.steps.length;
    const steps = workflow.steps.slice(executionContext.currentStep, endStep);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      executionContext.currentStep = i + (options.startStep || 0);

      if (options.dryRun) {
        console.log(chalk.gray(`[DRY RUN] Would execute: ${step.command}`));
        result.output.push(`[DRY RUN] ${step.command}`);
        result.stepsExecuted++;
        continue;
      }

      try {
        const stepResult = await this.executeStep(step, options);
        result.stepsExecuted++;

        if (stepResult.success) {
          result.output.push(
            `✅ ${step.command}: ${stepResult.output || 'Success'}`
          );
        } else {
          const errorMsg = `❌ ${step.command}: ${
            stepResult.error || 'Failed'
          }`;
          result.errors.push(errorMsg);
          result.output.push(errorMsg);

          if (!options.continueOnError) {
            result.success = false;
            break;
          }
        }

        // Store result for next step
        this.executionContext.lastResult = stepResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const errorMsg = `❌ ${step.command}: ${errorMessage}`;
        result.errors.push(errorMsg);
        result.output.push(errorMsg);

        if (!options.continueOnError) {
          result.success = false;
          break;
        }
      }
    }

    result.duration = Date.now() - startTime;

    if (result.success) {
      console.log(
        chalk.green(`✅ Workflow "${workflowName}" completed successfully`)
      );
    } else {
      console.log(chalk.red(`❌ Workflow "${workflowName}" failed`));
    }

    return result;
  }

  // List all workflows
  public listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  // Get workflow information
  public getWorkflowInfo(workflowName: string): Workflow | null {
    return this.workflows.get(workflowName) || null;
  }

  // Delete a workflow
  public async deleteWorkflow(
    workflowName: string
  ): Promise<AsyncResult<void>> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return {
        success: false,
        error: `Workflow "${workflowName}" not found`,
      };
    }

    // Remove from disk
    const workflowPath = path.join(
      this.workflowDirectory,
      `${workflowName}.workflow.json`
    );

    try {
      await fs.remove(workflowPath);
      this.workflows.delete(workflowName);
      console.log(chalk.green(`🗑️  Deleted workflow: ${workflowName}`));
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to delete workflow: ${errorMessage}`,
      };
    }
  }

  // Execute a single workflow step
  private async executeStep(
    step: WorkflowStep,
    options: WorkflowExecutionOptions
  ): Promise<CommandResult> {
    if (options.verbose) {
      console.log(chalk.blue(`🔧 Executing: ${step.command}`));
    }

    // Parse command and arguments
    const parts = step.command.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    return new Promise((resolve) => {
      const child: ChildProcess = spawn(command, args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: stdout.trim(),
          });
        } else {
          resolve({
            success: false,
            error: stderr.trim() || `Command exited with code ${code}`,
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  }

  // Execute command step
  private async executeCommandStep(
    command: string,
    args: string[],
    options: WorkflowExecutionOptions
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      const child: ChildProcess = spawn(command, args, {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
          if (options.verbose) {
            process.stdout.write(data);
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
          if (options.verbose) {
            process.stderr.write(data);
          }
        });
      }

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: code !== 0 ? stderr : undefined,
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  }

  // Helper methods
  private async saveRecordingState(): Promise<void> {
    if (!this.recordingSession) return;

    const statePath = path.join(
      this.workflowDirectory,
      '.recording-state.json'
    );
    await fs.writeJson(statePath, {
      activeRecording: this.activeRecording,
      session: this.recordingSession,
    });
  }

  private async loadRecordingState(): Promise<void> {
    const statePath = path.join(
      this.workflowDirectory,
      '.recording-state.json'
    );

    if (await fs.pathExists(statePath)) {
      try {
        const state = await fs.readJson(statePath);
        this.activeRecording = state.activeRecording;
        this.recordingSession = state.session;

        if (this.activeRecording) {
          console.log(
            chalk.yellow(`🔄 Resumed recording: ${this.activeRecording}`)
          );
        }
      } catch (error) {
        console.warn(chalk.yellow('Failed to load recording state'));
      }
    }
  }

  private async clearRecordingState(): Promise<void> {
    const statePath = path.join(
      this.workflowDirectory,
      '.recording-state.json'
    );
    if (await fs.pathExists(statePath)) {
      await fs.remove(statePath);
    }
  }

  private setupEventListeners(): void {
    // Set up event listeners for triggers and scheduled tasks
    // This is a simplified implementation
  }

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters for accessing state
  public get isRecording(): boolean {
    return this.activeRecording !== null;
  }

  public get currentRecording(): string | null {
    return this.activeRecording;
  }

  public get workflowCount(): number {
    return this.workflows.size;
  }
}
