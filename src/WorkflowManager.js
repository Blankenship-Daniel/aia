// Workflow Automation System
// Provides macro recording, conditional logic, and task automation

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { spawn } = require('child_process');

class WorkflowManager {
  constructor(workflowDirectory) {
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
  async initialize() {
    await fs.ensureDir(this.workflowDirectory);
    await this.loadWorkflows();
    await this.loadRecordingState();
    this.setupEventListeners();
    console.log(chalk.blue('🔄 Workflow automation system initialized'));
  }

  // Load all workflows from disk
  async loadWorkflows() {
    try {
      const workflowFiles = await fs.readdir(this.workflowDirectory);

      for (const file of workflowFiles) {
        if (file.endsWith('.workflow.json')) {
          const workflowPath = path.join(this.workflowDirectory, file);
          const workflow = await fs.readJson(workflowPath);
          this.workflows.set(workflow.name, workflow);
        }
      }

      console.log(chalk.green(`📂 Loaded ${this.workflows.size} workflows`));
    } catch (error) {
      console.warn(chalk.yellow('Workflow loading warning:', error.message));
    }
  }

  // Start recording a new workflow
  async startRecording(workflowName, options = {}) {
    if (this.activeRecording) {
      throw new Error('A workflow recording is already in progress');
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

    return { success: true, name: workflowName };
  }

  // Stop recording and save workflow
  async stopRecording() {
    if (!this.activeRecording) {
      throw new Error('No workflow recording in progress');
    }

    const workflowName = this.activeRecording;
    const workflow = this.recordingSession;

    // Save workflow to disk
    const workflowPath = path.join(
      this.workflowDirectory,
      `${workflowName}.workflow.json`
    );
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });

    // Add to loaded workflows
    this.workflows.set(workflowName, workflow);

    // Clear recording state
    this.activeRecording = null;
    this.recordingSession = null;

    // Clear recording state file
    await this.saveRecordingState();

    console.log(
      chalk.green(
        `✅ Workflow "${workflowName}" saved with ${workflow.steps.length} steps`
      )
    );

    return {
      success: true,
      name: workflowName,
      steps: workflow.steps.length,
      path: workflowPath,
    };
  }

  // Record a command execution step
  // Record a command execution step
  recordStep(command, args, context, result) {
    if (!this.activeRecording) {
      return; // Not recording
    }

    const step = {
      type: 'command',
      timestamp: new Date().toISOString(),
      command,
      args: args || [],
      context: {
        workingDirectory: context.workingDirectory,
        projectType: context.projectType,
        gitStatus: context.gitStatus ? 'present' : 'none',
      },
      result: {
        success: result?.success || true,
        output: result?.output ? 'captured' : 'none',
        duration: result?.duration || 0,
      },
    };

    this.recordingSession.steps.push(step);
    console.log(
      chalk.gray(`📝 Recorded: ${command} ${(args || []).join(' ')}`)
    );

    // Save recording state after each step (fire and forget)
    this.saveRecordingState().catch((err) =>
      console.warn(
        chalk.yellow('Warning: Failed to save recording state:', err.message)
      )
    );
  } // Record an AI query step
  recordAIQuery(query, model, context, response) {
    if (!this.activeRecording) {
      return; // Not recording
    }

    const step = {
      type: 'ai_query',
      timestamp: new Date().toISOString(),
      query,
      model,
      context: {
        workingDirectory: context.workingDirectory,
        projectType: context.projectType,
      },
      response: {
        length: response?.length || 0,
        model: model,
      },
    };

    this.recordingSession.steps.push(step);
    console.log(
      chalk.gray(`📝 Recorded AI query: ${query.substring(0, 50)}...`)
    );

    // Save recording state after each step (fire and forget)
    this.saveRecordingState().catch((err) =>
      console.warn(
        chalk.yellow('Warning: Failed to save recording state:', err.message)
      )
    );
  }

  // Execute a workflow
  async executeWorkflow(workflowName, options = {}) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow "${workflowName}" not found`);
    }

    console.log(chalk.blue(`🚀 Executing workflow: ${workflowName}`));
    console.log(chalk.gray(`Description: ${workflow.description}`));
    console.log(chalk.gray(`Steps: ${workflow.steps.length}`));

    const execution = {
      workflowName,
      startTime: new Date(),
      steps: [],
      success: true,
      errors: [],
    };

    // Reset execution context
    this.executionContext.variables.clear();
    this.executionContext.lastResult = null;
    this.executionContext.errors = [];

    // Execute each step
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];

      try {
        console.log(
          chalk.gray(`  Step ${i + 1}/${workflow.steps.length}: ${step.type}`)
        );

        const stepResult = await this.executeStep(step, options);
        execution.steps.push({
          step: i + 1,
          type: step.type,
          success: stepResult.success,
          duration: stepResult.duration,
          output: stepResult.output,
        });

        if (!stepResult.success && !options.continueOnError) {
          execution.success = false;
          execution.errors.push(`Step ${i + 1} failed: ${stepResult.error}`);
          break;
        }
      } catch (error) {
        execution.success = false;
        execution.errors.push(`Step ${i + 1} error: ${error.message}`);

        if (!options.continueOnError) {
          break;
        }
      }
    }

    execution.endTime = new Date();
    execution.duration = execution.endTime - execution.startTime;

    // Log execution summary
    if (execution.success) {
      console.log(
        chalk.green(`✅ Workflow "${workflowName}" completed successfully`)
      );
    } else {
      console.log(chalk.red(`❌ Workflow "${workflowName}" failed`));
      execution.errors.forEach((error) =>
        console.log(chalk.red(`   ${error}`))
      );
    }

    return {
      success: execution.success,
      stepsExecuted: execution.steps.length,
      duration: execution.duration,
      error: execution.errors.length > 0 ? execution.errors.join('; ') : null,
      failedStep: execution.success ? null : execution.steps.length + 1,
    };
  }

  // List all workflows
  listWorkflows() {
    return Array.from(this.workflows.values());
  }

  // Get workflow information
  getWorkflowInfo(workflowName) {
    return this.workflows.get(workflowName) || null;
  }

  // Delete a workflow
  async deleteWorkflow(workflowName) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    try {
      // Delete file
      const workflowPath = path.join(
        this.workflowDirectory,
        `${workflowName}.workflow.json`
      );
      if (await fs.pathExists(workflowPath)) {
        await fs.remove(workflowPath);
      }

      // Remove from memory
      this.workflows.delete(workflowName);

      return { success: true, name: workflowName };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Execute a single workflow step
  async executeStep(step, options = {}) {
    const startTime = Date.now();

    try {
      let result = { success: true, output: null };

      switch (step.type) {
        case 'command':
          result = await this.executeCommandStep(step, options);
          break;
        case 'ai_query':
          result = await this.executeAIQueryStep(step, options);
          break;
        case 'condition':
          result = await this.executeConditionStep(step, options);
          break;
        case 'variable':
          result = await this.executeVariableStep(step, options);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  // Execute command step
  async executeCommandStep(step, options) {
    if (options.verbose) {
      console.log(
        chalk.gray(
          `    Executing: ${step.command} ${(step.args || []).join(' ')}`
        )
      );
    }

    const { spawn } = require('child_process');

    return new Promise((resolve) => {
      const child = spawn(step.command, step.args || [], {
        stdio: options.verbose ? 'inherit' : 'pipe',
        cwd: step.context?.workingDirectory || process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      if (!options.verbose) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        this.executionContext.lastResult = {
          exitCode: code,
          stdout,
          stderr,
        };

        resolve({
          success: code === 0,
          output: stdout,
          error: stderr,
          exitCode: code,
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

  // Execute AI query step
  async executeAIQueryStep(step, options) {
    if (options.verbose) {
      console.log(
        chalk.gray(`    AI Query: ${step.query.substring(0, 50)}...`)
      );
    }

    // This would need access to the AIA instance to make AI queries
    // For now, return a placeholder
    return {
      success: true,
      output: 'AI query execution not implemented in workflow context',
      note: 'This step was recorded but cannot be replayed without AI integration',
    };
  }

  // Execute condition step
  async executeConditionStep(step, options) {
    if (options.verbose) {
      console.log(chalk.gray(`    Condition: ${step.condition}`));
    }

    // Basic condition evaluation
    const condition = step.condition;
    const context = this.executionContext;

    // Simple variable substitution and evaluation
    let result = false;
    try {
      // This is a simplified condition evaluator
      // In a real implementation, you'd want a proper expression parser
      if (condition.includes('lastResult.exitCode')) {
        const exitCode = context.lastResult?.exitCode || 0;
        result = eval(condition.replace('lastResult.exitCode', exitCode));
      } else {
        result = eval(condition);
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`Condition evaluation failed: ${error.message}`)
      );
      result = false;
    }

    return {
      success: true,
      output: result ? 'true' : 'false',
      conditionResult: result,
    };
  }

  // Execute variable step
  async executeVariableStep(step, options) {
    if (options.verbose) {
      console.log(chalk.gray(`    Variable: ${step.variable} = ${step.value}`));
    }

    // Set variable in execution context
    this.executionContext.variables.set(step.variable, step.value);

    return {
      success: true,
      output: `Variable ${step.variable} set to ${step.value}`,
    };
  }

  // Setup event listeners for triggers
  setupEventListeners() {
    // File system watcher for file change triggers
    // Git hook integration for git event triggers
    // Time-based scheduler for scheduled tasks
    // This is a placeholder for future implementation
  }

  // Get recording status
  getRecordingStatus() {
    return {
      recording: !!this.activeRecording,
      workflowName: this.activeRecording,
      steps: this.recordingSession?.steps.length || 0,
    };
  }

  // Load recording state from disk
  async loadRecordingState() {
    try {
      const statePath = path.join(
        this.workflowDirectory,
        '.recording-state.json'
      );
      if (await fs.pathExists(statePath)) {
        const state = await fs.readJson(statePath);
        this.activeRecording = state.activeRecording;
        this.recordingSession = state.recordingSession;

        if (this.activeRecording) {
          console.log(
            chalk.yellow(`🔴 Continuing recording: ${this.activeRecording}`)
          );
          console.log(
            chalk.gray(
              `Steps recorded so far: ${
                this.recordingSession?.steps?.length || 0
              }`
            )
          );
        }
      }
    } catch (error) {
      console.warn(
        chalk.yellow('Recording state loading warning:', error.message)
      );
    }
  }

  // Save recording state to disk
  async saveRecordingState() {
    try {
      const statePath = path.join(
        this.workflowDirectory,
        '.recording-state.json'
      );

      if (this.activeRecording) {
        await fs.writeJson(
          statePath,
          {
            activeRecording: this.activeRecording,
            recordingSession: this.recordingSession,
          },
          { spaces: 2 }
        );
      } else {
        // Remove state file if not recording
        if (await fs.pathExists(statePath)) {
          await fs.remove(statePath);
        }
      }
    } catch (error) {
      console.warn(
        chalk.yellow('Recording state saving warning:', error.message)
      );
    }
  }
}

module.exports = WorkflowManager;
