#!/usr/bin/env node

const chalk = require('chalk');
const AIA = require('../index.js');

async function testAPIKeyIntegration() {
  console.log(chalk.blue('🔑 Testing API Key Integration'));
  console.log(chalk.gray('─'.repeat(50)));

  const aia = new AIA();

  try {
    // Initialize AIA
    console.log(chalk.blue('🚀 Initializing AIA...'));
    await aia.init();
    console.log(chalk.green('✅ AIA initialized successfully'));

    // Test direct AI query
    console.log(chalk.blue('\n🤖 Testing direct AI query...'));
    const response = await aia.queryAI(
      'What is 2+2?',
      'claude-3-5-sonnet-20241022'
    );
    console.log(chalk.green('✅ AI query successful'));
    console.log(chalk.gray(`Response: ${response.substring(0, 100)}...`));

    // Test agentic reasoning with a simple goal
    console.log(chalk.blue('\n🎯 Testing simple agentic goal...'));
    const mockContext = {
      goal: 'count the number of JavaScript files in the current directory',
      iterations: 0,
      maxIterations: 2,
      workingDirectory: process.cwd(),
    };

    // Test plan generation
    console.log(chalk.gray('Generating plan...'));
    const plan = await aia.agenticEngine.generatePlan(mockContext);
    console.log(chalk.green('✅ Plan generated successfully'));
    console.log(chalk.gray(`Steps: ${plan.steps.length}`));
    plan.steps.forEach((step, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${step.description}`));
    });

    // Test evaluation
    console.log(chalk.blue('\n📊 Testing evaluation system...'));
    const mockResult = {
      stepResults: [
        {
          success: true,
          step: plan.steps[0],
          result: { stdout: 'file1.js\nfile2.js', stderr: '', code: 0 },
        },
      ],
    };

    const evaluation = await aia.agenticEngine.evaluateResult(
      mockResult,
      mockContext
    );
    console.log(chalk.green('✅ Evaluation completed'));
    console.log(chalk.gray(`Goal achieved: ${evaluation.goalAchieved}`));
    console.log(chalk.gray(`Progress score: ${evaluation.progressScore}`));

    console.log(chalk.green('\n🎉 All API key tests passed!'));
  } catch (error) {
    console.error(chalk.red('❌ API key test failed:'), error.message);
    console.error(chalk.gray(error.stack));
  }
}

// Run the test
testAPIKeyIntegration();
