#!/usr/bin/env node

const AIA = require('../index.js');

async function quickTest() {
  console.log('🔧 Quick AIA Test');

  const aia = new AIA();

  // Initialize without interactive mode
  aia.isInteractive = false;
  await aia.init();

  console.log('✅ AIA initialized');

  // Test a direct AI query
  try {
    const response = await aia.queryAI(
      'What is 2+2? Please answer briefly.',
      'claude-3-5-sonnet-20241022'
    );
    console.log('✅ AI query successful:', response.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ AI query failed:', error.message);
  }

  // Test command execution
  try {
    const result = await aia.executeCommand('echo "test"');
    console.log('✅ Command execution successful:', result.stdout.trim());
  } catch (error) {
    console.error('❌ Command execution failed:', error.message);
  }

  // Test agentic reasoning components
  try {
    const mockContext = {
      goal: 'list files',
      iterations: 0,
      maxIterations: 2,
    };

    const plan = await aia.agenticEngine.generatePlan(mockContext);
    console.log('✅ Plan generation successful:', plan.steps.length, 'steps');
  } catch (error) {
    console.error('❌ Plan generation failed:', error.message);
  }

  console.log('🎉 Quick test completed!');
  process.exit(0);
}

quickTest();
