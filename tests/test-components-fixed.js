#!/usr/bin/env node

// Direct test of AIA components without interactive mode
async function testAIA() {
  console.log('🔧 Testing AIA Components');

  // Import components
  const AgenticReasoningEngine = require('../src/AgenticReasoningEngine.js');
  const CommandHandler = require('../src/CommandHandler.js');

  try {
    // Create mock AIA instance
    const mockAIA = {
      memory: { commands: [] },
      config: {},
      context: { workingDirectory: process.cwd() },
    };

    // Initialize command handler
    const commandHandler = new CommandHandler(mockAIA);
    console.log('✅ CommandHandler initialized');

    // Test command execution
    const result = await commandHandler.executeCommand('echo "test"');
    console.log('✅ Command execution:', result.stdout.trim());

    // Initialize agentic engine with mock AI client
    const mockAIClient = {
      queryAI: async (prompt, model) => {
        return 'Mock AI response for testing';
      },
    };

    const agenticEngine = new AgenticReasoningEngine(mockAIA, mockAIClient);
    console.log('✅ AgenticReasoningEngine initialized');

    // Test step verification
    const testStep = {
      description: 'Test echo command',
      command: 'echo "hello world"',
      expectedOutcome: 'Output "hello world"',
    };

    const cmdResult = await commandHandler.executeCommand(testStep.command);
    const verification = await agenticEngine.verifyStepSuccess(
      testStep,
      cmdResult
    );

    console.log(
      '✅ Step verification:',
      verification.success ? 'PASSED' : 'FAILED'
    );
    console.log('  Confidence:', verification.confidence);
    console.log('  Reason:', verification.reason);

    // Test basic evaluation
    const mockExecutionResult = {
      stepResults: [
        {
          success: true,
          step: testStep,
          result: cmdResult,
        },
      ],
    };

    const mockContext = {
      goal: 'test echo command',
      iterations: 0,
      maxIterations: 2,
    };

    const evaluation = await agenticEngine.evaluateResult(
      mockExecutionResult,
      mockContext
    );
    console.log('✅ Evaluation completed');
    console.log('  Goal achieved:', evaluation.goalAchieved);
    console.log('  Progress score:', evaluation.progressScore);
    console.log('  Reasoning:', evaluation.reasoning);

    console.log('🎉 Component tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testAIA();
