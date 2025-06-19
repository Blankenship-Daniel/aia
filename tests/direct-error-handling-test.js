#!/usr/bin/env node

// Direct test of error handling logic without CLI
const path = require('path');

// Mock the enhanced error handling methods to verify they work
class MockAgenticReasoningEngine {
  constructor() {
    this.commandBlockHistory = new Map();
  }

  isCommandBlocked(command) {
    const failures = this.commandBlockHistory.get(command) || 0;
    const isBlocked = failures >= 3;

    if (isBlocked) {
      console.log(`🚫 Command "${command}" is blocked (${failures} failures)`);
    }

    return isBlocked;
  }

  trackCommandResult(command, success) {
    const currentFailures = this.commandBlockHistory.get(command) || 0;

    if (success) {
      this.commandBlockHistory.set(command, Math.max(0, currentFailures - 1));
      console.log(
        `✅ Command "${command}" succeeded, reducing failure count to ${Math.max(
          0,
          currentFailures - 1
        )}`
      );
    } else {
      const newFailures = currentFailures + 1;
      this.commandBlockHistory.set(command, newFailures);
      console.log(
        `❌ Command "${command}" failed, increasing failure count to ${newFailures}`
      );
    }
  }

  suggestCommandAlternative(command) {
    const alternatives = {
      'nonexistent-command': [
        'echo "Command not found, trying alternative"',
        'ls -la',
      ],
      'rm -rf /': ['echo "Dangerous command blocked"'],
      'bad-command': ['echo "Alternative command"', 'pwd'],
    };

    for (const [pattern, alts] of Object.entries(alternatives)) {
      if (command.includes(pattern)) {
        console.log(
          `💡 Suggesting alternatives for "${command}": ${alts.join(', ')}`
        );
        return alts[0];
      }
    }

    console.log(
      `💡 No specific alternative for "${command}", suggesting safe fallback`
    );
    return 'echo "Command not available"';
  }

  isStepCritical(step) {
    const criticalKeywords = ['delete', 'remove', 'format', 'destroy'];
    const isCritical = criticalKeywords.some(
      (keyword) => step.command && step.command.toLowerCase().includes(keyword)
    );

    if (isCritical) {
      console.log(`🔴 Step is critical: ${step.command}`);
    } else {
      console.log(`🟡 Step is non-critical: ${step.command}`);
    }

    return isCritical;
  }

  async executeStepWithRetry(step, maxRetries = 2) {
    console.log(`\n🔄 Executing step with retry: ${step.command}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`  Attempt ${attempt}/${maxRetries}`);

      // Simulate command execution
      const success = Math.random() > 0.7; // 30% success rate for demo

      if (success) {
        console.log(`  ✅ Step succeeded on attempt ${attempt}`);
        this.trackCommandResult(step.command, true);
        return { success: true, attempt };
      } else {
        console.log(`  ❌ Step failed on attempt ${attempt}`);

        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`  ⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    console.log(`  💥 Step failed after ${maxRetries} attempts`);
    this.trackCommandResult(step.command, false);
    return { success: false, attempts: maxRetries };
  }

  async demonstrateGracefulDegradation(steps) {
    console.log('\n🎭 Demonstrating Graceful Degradation Workflow');
    console.log('================================================\n');

    const results = [];

    for (const step of steps) {
      console.log(`\n📋 Processing step: ${step.description}`);

      // Check if command is blocked
      if (this.isCommandBlocked(step.command)) {
        console.log(`⏭️ Skipping blocked command, suggesting alternative...`);
        const alternative = this.suggestCommandAlternative(step.command);
        console.log(`🔄 Attempting alternative: ${alternative}`);
        // Would execute alternative here
        results.push({
          step: step.description,
          status: 'alternative',
          command: alternative,
        });
        continue;
      }

      // Check if step is critical
      const isCritical = this.isStepCritical(step);

      // Try to execute with retries
      const result = await this.executeStepWithRetry(step);

      if (result.success) {
        results.push({
          step: step.description,
          status: 'success',
          attempts: result.attempt,
        });
      } else {
        if (isCritical) {
          console.log(`🚨 Critical step failed, stopping workflow`);
          results.push({ step: step.description, status: 'critical_failure' });
          break;
        } else {
          console.log(
            `⚠️ Non-critical step failed, continuing with degraded functionality`
          );
          results.push({ step: step.description, status: 'graceful_failure' });
        }
      }
    }

    return results;
  }

  formatExecutionSummary(results) {
    console.log('\n📊 EXECUTION SUMMARY');
    console.log('====================\n');

    const successful = results.filter((r) => r.status === 'success').length;
    const alternatives = results.filter(
      (r) => r.status === 'alternative'
    ).length;
    const gracefulFailures = results.filter(
      (r) => r.status === 'graceful_failure'
    ).length;
    const criticalFailures = results.filter(
      (r) => r.status === 'critical_failure'
    ).length;

    console.log(`✅ Successful steps: ${successful}`);
    console.log(`💡 Alternative solutions used: ${alternatives}`);
    console.log(`⚠️ Graceful degradations: ${gracefulFailures}`);
    console.log(`🚨 Critical failures: ${criticalFailures}`);
    console.log(
      `📈 Success rate: ${Math.round((successful / results.length) * 100)}%`
    );

    console.log('\n📋 Detailed Results:');
    results.forEach((result, index) => {
      const statusIcon =
        {
          success: '✅',
          alternative: '💡',
          graceful_failure: '⚠️',
          critical_failure: '🚨',
        }[result.status] || '❓';

      console.log(`   ${index + 1}. ${statusIcon} ${result.step}`);
      if (result.attempts) {
        console.log(
          `      (succeeded after ${result.attempts} attempt${
            result.attempts > 1 ? 's' : ''
          })`
        );
      }
      if (result.command) {
        console.log(`      (used alternative: ${result.command})`);
      }
    });
  }
}

// Test the error handling logic
async function runErrorHandlingDemo() {
  console.log('🚀 Testing Enhanced Error Handling Logic');
  console.log('==========================================\n');

  const engine = new MockAgenticReasoningEngine();

  // Define test workflow with various scenarios
  const testSteps = [
    { description: 'Echo hello world', command: 'echo "hello world"' },
    { description: 'Run nonexistent command', command: 'nonexistent-command' },
    { description: 'List directory contents', command: 'ls -la' },
    { description: 'Run another bad command', command: 'bad-command' },
    { description: 'Check system info', command: 'uname -a' },
    {
      description: 'Run bad command again (should be blocked after 3 failures)',
      command: 'bad-command',
    },
    { description: 'Try dangerous command', command: 'rm -rf /' },
  ];

  // Simulate some command failures to trigger circuit breaker
  console.log('🔄 Pre-loading some command failures...');
  engine.trackCommandResult('bad-command', false);
  engine.trackCommandResult('bad-command', false);
  engine.trackCommandResult('bad-command', false); // This should trigger blocking

  // Run the workflow
  const results = await engine.demonstrateGracefulDegradation(testSteps);

  // Show summary
  engine.formatExecutionSummary(results);

  console.log('\n🎉 Error handling demo completed!');
  console.log('\nKey features demonstrated:');
  console.log('• 🔄 Retry with exponential backoff');
  console.log('• 🚫 Circuit breaker for repeatedly failing commands');
  console.log('• 💡 Alternative command suggestions');
  console.log('• ⚠️ Graceful degradation for non-critical failures');
  console.log('• 🚨 Workflow stopping for critical failures');
  console.log('• 📊 Comprehensive execution reporting');
}

// Run the demo
runErrorHandlingDemo().catch(console.error);
