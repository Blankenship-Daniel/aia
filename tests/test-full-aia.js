#!/usr/bin/env node

// Test AIA with proper API key integration
async function testFullAIA() {
  console.log('🔧 Testing Full AIA System with API Key');

  // Import main AIA class
  const AIA = require('../dist/index.js');

  try {
    // Create AIA instance
    const aia = new AIA();

    // Disable interactive mode to prevent blocking
    aia.isInteractive = false;

    // Initialize AIA (this should load API keys)
    console.log('🚀 Initializing AIA...');
    await aia.init();
    console.log('✅ AIA initialized');

    // Test direct AI query
    console.log('🤖 Testing AI query...');
    try {
      const response = await aia.queryAI(
        'What is 2+2? Answer briefly.',
        'claude-3-5-sonnet-20241022'
      );
      console.log('✅ AI query successful:', response.substring(0, 100));
    } catch (error) {
      console.log('⚠️  AI query failed:', error.message);
    }

    // Test agentic reasoning system
    console.log('🧠 Testing agentic reasoning...');
    const mockContext = {
      goal: 'count the number of .js files in current directory',
      iterations: 0,
      maxIterations: 2,
      workingDirectory: process.cwd(),
    };

    try {
      const plan = await aia.agenticEngine.generatePlan(mockContext);
      console.log('✅ Plan generation:', plan.steps.length, 'steps');

      // Execute first step to test the full workflow
      if (plan.steps.length > 0) {
        const firstStep = plan.steps[0];
        console.log('🔧 Executing first step:', firstStep.description);

        const result = await aia.executeCommand(firstStep.command);
        console.log(
          '✅ Step execution:',
          result.success ? 'SUCCESS' : 'FAILED'
        );

        // Test step verification
        const verification = await aia.agenticEngine.verifyStepSuccess(
          firstStep,
          result
        );
        console.log(
          '✅ Step verification:',
          verification.success ? 'PASSED' : 'FAILED'
        );

        // Test evaluation
        const executionResult = {
          stepResults: [
            {
              success: result.success,
              step: firstStep,
              result: result,
            },
          ],
        };

        const evaluation = await aia.agenticEngine.evaluateResult(
          executionResult,
          mockContext
        );
        console.log('✅ Evaluation completed');
        console.log('  Goal achieved:', evaluation.goalAchieved);
        console.log('  Progress score:', evaluation.progressScore);
      }
    } catch (error) {
      console.log('⚠️  Agentic reasoning test failed:', error.message);
    }

    console.log('🎉 Full AIA system test completed!');
  } catch (error) {
    console.error('❌ AIA system test failed:', error.message);
    console.error(error.stack);
  }

  // Ensure we exit cleanly
  process.exit(0);
}

testFullAIA();
