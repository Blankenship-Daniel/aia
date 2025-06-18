/**
 * Command System Test
 * Tests the command pattern implementation
 */

async function testBasicRegistry() {
  console.log('🧪 Testing Basic Command Registry...');

  const CommandRegistry = require('../src/services/CommandRegistry');
  const registry = new CommandRegistry();

  // Test basic functionality
  console.log(
    '✅ Registry created, command count:',
    registry.getCommandCount()
  );

  // Test with mock command
  const mockCommand = {
    execute: async () => 'test result',
    getDefinition: () => ({
      name: 'test',
      description: 'Test command',
      aliases: ['t'],
    }),
    getName: () => 'test',
    getDescription: () => 'Test command',
  };

  registry.register(mockCommand);
  console.log('✅ Command registered, new count:', registry.getCommandCount());

  const retrieved = registry.getCommand('test');
  console.log('✅ Command retrieved:', retrieved.getName());

  return true;
}

async function testServiceIntegration() {
  console.log('🧪 Testing Service Integration...');

  const ServiceFactory = require('../src/container/ServiceFactory');
  const container = ServiceFactory.createContainer();

  // Test service resolution
  const aiService = container.resolve('ai');
  const memoryService = container.resolve('memory');
  console.log('✅ Services resolved');

  return true;
}

async function testCommandCreation() {
  console.log('🧪 Testing Command Creation...');

  const CommandFactory = require('../src/commands/CommandFactory');
  const ServiceFactory = require('../src/container/ServiceFactory');

  const container = ServiceFactory.createContainer();
  const services = {
    aiService: container.resolve('ai'),
    memoryService: container.resolve('memory'),
    contextService: container.resolve('context'),
    commandService: container.resolve('command'),
    configurationService: container.resolve('configuration'),
    logger: console,
  };

  const commands = CommandFactory.createCommands(services);
  console.log('✅ Commands created:', commands.length);

  commands.forEach((cmd) => {
    console.log('  - ' + cmd.getName() + ': ' + cmd.getDescription());
  });

  return true;
}

async function runTests() {
  console.log('🚀 Starting Command System Tests...\n');

  try {
    await testBasicRegistry();
    console.log('');

    await testServiceIntegration();
    console.log('');

    await testCommandCreation();
    console.log('');

    console.log('🎉 All tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests
if (require.main === module) {
  runTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
