# AIA Agent UX Enhancement Plan

## Implementation: Enhanced Step Progress Display

### Current vs. Proposed Experience

**Current Experience:**

```
[1/2] Check git repository status
   Command: git status
   Expected: Display current git status

[LONG SILENCE - User has no idea what's happening]

✓ Check git repository status (1234ms)
```

**Proposed Enhanced Experience:**

```
🔄 Execution Phase [Step 1/2]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Executing: Check git repository status
   Command: git status
   Timeout: 30s | Elapsed: 2.1s | Memory: 45MB

✓ Check git repository status completed (2.134s)
   Output: 15 lines | Exit Code: 0 | Status: Clean working directory
```

### Code Implementation

```typescript
// Enhanced showExecutionStep method
showExecutionStep(step: ExecutionStep): {
  succeed: (message?: string) => void;
  fail: (message?: string) => void;
  updateProgress: (elapsed: number, memoryMB?: number) => void;
  stop: () => void;
} {
  const startTime = Date.now();
  console.log(`\n🔄 Execution Phase [Step ${step.stepNumber}/${step.totalSteps}]`);
  console.log(chalk.gray('━'.repeat(60)));
  console.log(`${chalk.blue('⚡')} Executing: ${chalk.bold(step.description)}`);
  console.log(`   Command: ${chalk.yellow(step.command)}`);

  const progressLine = `   Progress: `;
  process.stdout.write(progressLine);

  let progressInterval: NodeJS.Timeout;

  const updateProgress = (elapsed: number, memoryMB?: number) => {
    const timeoutSec = (step.timeout || 60000) / 1000;
    const elapsedSec = elapsed / 1000;
    const percentage = Math.min((elapsed / (step.timeout || 60000)) * 100, 100);

    // Clear previous progress line
    process.stdout.clearLine(0);
    process.stdout.cursorTo(progressLine.length);

    // Progress bar
    const barLength = 20;
    const filled = Math.floor((percentage / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    const memoryInfo = memoryMB ? ` | Memory: ${memoryMB}MB` : '';
    const progressText = `[${bar}] ${elapsedSec.toFixed(1)}s/${timeoutSec}s${memoryInfo}`;

    process.stdout.write(chalk.cyan(progressText));
  };

  // Start progress updates
  progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    updateProgress(elapsed, memoryMB);
  }, 100);

  return {
    succeed: (message?: string, outputLines?: number) => {
      clearInterval(progressInterval);
      const duration = Date.now() - startTime;
      process.stdout.write('\n');

      const outputInfo = outputLines ? ` | Output: ${outputLines} lines` : '';
      console.log(`${chalk.green('✓')} ${message || step.description} completed (${(duration/1000).toFixed(3)}s)${outputInfo}`);
    },

    fail: (message?: string, exitCode?: number) => {
      clearInterval(progressInterval);
      const duration = Date.now() - startTime;
      process.stdout.write('\n');

      const codeInfo = exitCode !== undefined ? ` | Exit Code: ${exitCode}` : '';
      console.log(`${chalk.red('✗')} ${message || step.description} failed (${(duration/1000).toFixed(3)}s)${codeInfo}`);
    },

    updateProgress,

    stop: () => {
      clearInterval(progressInterval);
      process.stdout.write('\n');
    }
  };
}
```

#### 2. **Improved Error Messages with Actionable Solutions**

**Current Error Display:**

```
📚 Learnings:
1. Step "Generate dependency graph" failed: ERROR: Can't open config file
```

**Proposed Enhanced Error Display:**

```
❌ Execution Issues Found

[1/3] Configuration Error - Dependency Cruiser
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: Can't open a config file (.dependency-cruiser.(c)js)
Cause: Missing configuration file for dependency analysis
Solution: Run 'npx depcruise --init' to create config file
Impact: Non-critical - Analysis can continue without dependency graph

[2/3] System Tool Missing - Graphviz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: /bin/sh: dot: command not found
Cause: Graphviz not installed on system
Solution: Install with 'brew install graphviz' or 'apt-get install graphviz'
Impact: Blocks visualization - use alternative text-based output

💡 Quick Fix: Run these commands to resolve issues:
1. npx depcruise --init
2. brew install graphviz
3. Re-run the agent command
```

#### 3. **Memory Usage and Performance Monitoring**

```typescript
// Add to execution summary
displayExecutionSummary(execution: AgenticExecution): void {
  const totalTime = Date.now() - this.startTime;
  const memoryStats = this.getMemoryStats();

  console.log(chalk.blue('\n📊 Execution Summary'));
  console.log(chalk.gray('━'.repeat(60)));
  console.log(`🎯 Goal: ${chalk.cyan(execution.goal)}`);
  console.log(`⚡ Status: ${execution.success ? chalk.green('✓ Completed') : chalk.red('✗ Failed')}`);
  console.log(`⏱️  Total Time: ${chalk.yellow((totalTime/1000).toFixed(2)}s)} (within 5min timeout)`);
  console.log(`🔢 Steps: ${chalk.cyan(execution.completedSteps)}/${execution.totalSteps}`);
  console.log(`🎯 Success Rate: ${chalk.green(execution.successRate.toFixed(1))}%`);
  console.log(`💾 Memory Peak: ${chalk.yellow(memoryStats.peakMB)}MB`);
  console.log(`📁 Files Analyzed: ${chalk.cyan(execution.filesProcessed || 0)}`);

  if (execution.performance) {
    console.log(`⚡ Performance: ${this.getPerformanceRating(totalTime)}`);
  }

  console.log(chalk.gray('━'.repeat(60)));

  if (execution.nextSteps && execution.nextSteps.length > 0) {
    console.log(chalk.blue('\n💡 Suggested Next Steps:'));
    execution.nextSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });
  }

  if (execution.learnings && execution.learnings.length > 0) {
    console.log(chalk.blue('\n📚 Key Learnings:'));
    execution.learnings.forEach(learning => {
      console.log(`• ${learning}`);
    });
  }
}
```
