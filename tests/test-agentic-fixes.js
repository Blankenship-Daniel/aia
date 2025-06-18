#!/usr/bin/env node

const chalk = require('chalk');
const AIA = require('../index.js');

// Test script to identify and fix key agentic reasoning issues
async function testAgenticFixes() {
  console.log(chalk.blue('🔧 Testing Agentic Reasoning Fixes'));
  console.log(chalk.gray('─'.repeat(60)));

  const aia = new AIA();

  try {
    // Initialize AIA
    console.log(chalk.blue('🚀 Initializing AIA...'));
    await aia.init();
    console.log(chalk.green('✅ AIA initialized successfully'));

    // Test 1: JSON Evaluation Parsing
    console.log(chalk.blue('\n📊 Test 1: JSON Evaluation System'));
    await testJSONEvaluation(aia);

    // Test 2: Shell Command Execution
    console.log(chalk.blue('\n🐚 Test 2: Shell Command Execution'));
    await testShellCommandExecution(aia);

    // Test 3: Step Verification
    console.log(chalk.blue('\n🔍 Test 3: Step Verification'));
    await testStepVerification(aia);

    // Test 4: Plan Adaptation
    console.log(chalk.blue('\n🧠 Test 4: Plan Adaptation'));
    await testPlanAdaptation(aia);

    console.log(chalk.green('\n🎉 All tests completed!'));
  } catch (error) {
    console.error(chalk.red('❌ Test suite failed:'), error.message);
    console.error(chalk.gray(error.stack));
  }
}

async function testJSONEvaluation(aia) {
  try {
    // Create a mock execution result to test evaluation
    const mockExecutionResult = {
      stepResults: [
        {
          success: true,
          step: {
            description: 'List JavaScript files',
            command: 'find . -name "*.js"',
          },
          result: {
            stdout: 'file1.js\nfile2.js\nfile3.js',
            stderr: '',
            code: 0,
          },
        },
        {
          success: false,
          step: { description: 'Count files', command: 'wc -l' },
          result: { stdout: '', stderr: 'wc: missing operand', code: 1 },
        },
      ],
    };

    const mockContext = {
      goal: 'count JavaScript files',
      iterations: 1,
      maxIterations: 3,
    };

    console.log(chalk.gray('Testing evaluation with mock data...'));
    const evaluation = await aia.agenticEngine.evaluateResult(
      mockExecutionResult,
      mockContext
    );

    console.log(chalk.green('✅ JSON evaluation completed'));
    console.log(chalk.gray(`Goal achieved: ${evaluation.goalAchieved}`));
    console.log(chalk.gray(`Progress score: ${evaluation.progressScore}`));
  } catch (error) {
    console.error(chalk.red('❌ JSON evaluation test failed:'), error.message);
    throw error;
  }
}

async function testShellCommandExecution(aia) {
  try {
    console.log(chalk.gray('Testing simple command...'));
    const result1 = await aia.executeCommand('echo "Hello World"');
    console.log(chalk.green('✅ Simple command executed'));
    console.log(chalk.gray(`Output: ${result1.stdout.trim()}`));

    console.log(chalk.gray('Testing pipe command...'));
    const result2 = await aia.executeCommand('echo "test" | wc -c');
    console.log(chalk.green('✅ Pipe command executed'));
    console.log(chalk.gray(`Output: ${result2.stdout.trim()}`));

    console.log(chalk.gray('Testing complex command...'));
    const result3 = await aia.executeCommand(
      'find . -name "*.js" -type f | head -3'
    );
    console.log(chalk.green('✅ Complex command executed'));
    console.log(
      chalk.gray(`Files found: ${result3.stdout.split('\n').length - 1}`)
    );
  } catch (error) {
    console.error(chalk.red('❌ Shell command test failed:'), error.message);
    throw error;
  }
}

async function testStepVerification(aia) {
  try {
    const testStep = {
      description: 'List JavaScript files in project',
      command: 'find . -name "*.js" -type f -not -path "./node_modules/*"',
      expectedOutcome: 'List of JavaScript files with paths',
      verificationMethod: 'Check for .js file paths in output',
    };

    console.log(chalk.gray('Executing test command...'));
    const result = await aia.executeCommand(testStep.command);

    console.log(chalk.gray('Testing step verification...'));
    const verification = await aia.agenticEngine.verifyStepSuccess(
      testStep,
      result
    );

    console.log(chalk.green('✅ Step verification completed'));
    console.log(chalk.gray(`Success: ${verification.success}`));
    console.log(chalk.gray(`Confidence: ${verification.confidence}`));
    console.log(chalk.gray(`Reason: ${verification.reason}`));
  } catch (error) {
    console.error(
      chalk.red('❌ Step verification test failed:'),
      error.message
    );
    throw error;
  }
}

async function testPlanAdaptation(aia) {
  try {
    console.log(chalk.gray('Testing plan generation...'));

    const mockContext = {
      goal: 'find JavaScript files and count them',
      iterations: 0,
      maxIterations: 2,
      nlpAnalysis: {
        intent: { intent: 'analyze', confidence: 0.8 },
        goalType: 'ANALYSIS',
        entities: { fileTypes: ['javascript'] },
      },
    };

    const plan = await aia.agenticEngine.generatePlan(mockContext);

    console.log(chalk.green('✅ Plan generation completed'));
    console.log(chalk.gray(`Steps generated: ${plan.steps.length}`));

    // Test plan adaptation after failure
    console.log(chalk.gray('Testing plan adaptation after failure...'));
    const failedResult = {
      stepResults: [
        {
          success: false,
          step: plan.steps[0],
          error: 'Command not found',
          result: { code: 127, stderr: 'command not found' },
        },
      ],
    };

    mockContext.iterations = 1;
    await aia.agenticEngine.learnFromExecution(
      failedResult,
      { goalAchieved: false },
      mockContext
    );

    console.log(chalk.green('✅ Plan adaptation completed'));
  } catch (error) {
    console.error(chalk.red('❌ Plan adaptation test failed:'), error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testAgenticFixes();
}

module.exports = { testAgenticFixes };
