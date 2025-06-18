#!/usr/bin/env node

// Test AIA agentic reasoning with API key
async function testAgenticGoal() {
  console.log('🎯 Testing AIA Agentic Goal Execution');

  // Set up environment to avoid interactive mode
  process.argv = ['node', 'test-agentic-goal.js', 'test-mode'];

  const AIA = require('../index.js');

  try {
    const aia = new AIA();

    // Initialize AIA
    console.log('🚀 Initializing AIA...');
    await aia.init();
    console.log('✅ AIA initialized successfully');

    // Test a simple agentic goal
    console.log('🎯 Testing agentic goal execution...');
    const goal =
      'find all JavaScript files in the current directory and count them';

    const result = await aia.executeAgenticGoal(goal, {
      autoExecute: false,
      maxIterations: 2,
      verbose: true,
    });

    console.log('✅ Agentic goal execution completed!');
    console.log('📊 Results:');
    console.log('  Goal:', goal);
    console.log('  Success:', result.success);
    console.log('  Iterations:', result.iterations);
    console.log(
      '  Steps executed:',
      result.executionResult?.stepResults?.length || 0
    );

    // Test step verification specifically
    if (result.executionResult?.stepResults?.length > 0) {
      const firstStep = result.executionResult.stepResults[0];
      console.log('🔍 First step verification:');
      console.log('  Step:', firstStep.step.description);
      console.log('  Success:', firstStep.success);
      console.log('  Command:', firstStep.step.command);
      if (firstStep.result) {
        console.log('  Output length:', firstStep.result.stdout?.length || 0);
        console.log('  Exit code:', firstStep.result.code);
      }
    }

    console.log('🎉 Agentic goal test completed successfully!');
  } catch (error) {
    console.error('❌ Agentic goal test failed:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

testAgenticGoal();
