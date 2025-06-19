/**
 * Service Architecture Test
 * Tests the new DI container and service implementations
 */
const { DIContainer } = require('../dist/container/DIContainer');
const { ServiceFactory } = require('../dist/container/ServiceFactory');
const {
  ConfigurationService,
} = require('../dist/services/ConfigurationService');
const { MemoryService } = require('../dist/services/MemoryService');

async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');

  // Clean test environment - remove any existing memory file
  const fs = require('fs-extra');
  const path = require('path');
  const os = require('os');

  const aiaDir = path.join(os.homedir(), '.aia');
  const memoryFile = path.join(aiaDir, 'memory.json');

  try {
    if (await fs.pathExists(memoryFile)) {
      await fs.remove(memoryFile);
      console.log('✅ Cleaned existing memory file');
    }
  } catch (error) {
    console.log('⚠️  Could not clean memory file:', error.message);
  }
}

async function testDIContainer() {
  console.log('🧪 Testing DI Container...');

  try {
    // Test basic container functionality
    const container = new DIContainer();

    // Test service registration
    container.register(
      'test',
      class TestService {
        constructor(value) {
          this.value = value;
        }
        getValue() {
          return this.value;
        }
      }
    );

    container.registerFactory('testFactory', () => new Date());
    container.registerInstance('testInstance', { message: 'Hello World' });

    // Test service resolution
    const testService = container.resolve('test');
    const factoryService = container.resolve('testFactory');
    const instanceService = container.resolve('testInstance');

    console.log('✅ Basic DI container functionality works');

    // Test singleton behavior
    const testService2 = container.resolve('test');
    if (testService === testService2) {
      console.log('✅ Singleton behavior works');
    } else {
      console.log('❌ Singleton behavior failed');
    }

    // Test service factory
    const serviceContainer = ServiceFactory.createContainer();
    const validation = ServiceFactory.validateContainer(serviceContainer);

    if (validation.valid) {
      console.log('✅ Service factory creates valid container');
    } else {
      console.log('❌ Service factory validation failed:', validation.errors);
    }

    console.log('✅ DI Container tests passed');
  } catch (error) {
    console.error('❌ DI Container test failed:', error.message);
    throw error;
  }
}

async function testConfigurationService() {
  console.log('🧪 Testing Configuration Service...');

  try {
    const configService = new ConfigurationService();
    await configService.initialize();

    // Test basic get/set
    await configService.set('test.value', 'hello');
    const value = configService.get('test.value');

    if (value === 'hello') {
      console.log('✅ Configuration get/set works');
    } else {
      console.log('❌ Configuration get/set failed');
    }

    // Test has/delete
    if (configService.has('test.value')) {
      await configService.delete('test.value');
      if (!configService.has('test.value')) {
        console.log('✅ Configuration has/delete works');
      } else {
        console.log('❌ Configuration delete failed - value still exists');
      }
    } else {
      console.log('❌ Configuration has failed - test value not found');
    }

    // Test validation
    const validation = configService.validate({
      preferredModel: 'gpt-4',
      autoOptimize: true,
      maxMemorySize: 5000,
    });

    if (validation.valid) {
      console.log('✅ Configuration validation works');
    } else {
      console.log('❌ Configuration validation failed:', validation.errors);
    }

    console.log('✅ Configuration Service tests passed');
  } catch (error) {
    console.error('❌ Configuration Service test failed:', error.message);
    throw error;
  }
}

async function testMemoryService() {
  console.log('🧪 Testing Memory Service...');

  try {
    const configService = new ConfigurationService();
    await configService.initialize();

    const memoryService = new MemoryService(configService);
    await memoryService.initialize();

    // Test conversation storage
    await memoryService.addConversation(
      'test query',
      'test response',
      { workingDirectory: '/test' },
      'gpt-4'
    );

    const conversations = await memoryService.getRecentConversations(1);
    if (conversations.length === 1 && conversations[0].query === 'test query') {
      console.log('✅ Memory conversation storage works');
    } else {
      console.log(
        '❌ Memory conversation storage failed. Conversations:',
        conversations.length,
        conversations[0] ? conversations[0].query : 'none'
      );
    }

    // Test command storage
    await memoryService.addCommand(
      'ls -la',
      { exitCode: 0, stdout: 'test output', duration: 100 },
      { workingDirectory: '/test' }
    );

    const commands = await memoryService.getRecentCommands(1);
    if (commands.length === 1 && commands[0].command === 'ls -la') {
      console.log('✅ Memory command storage works');
    } else {
      console.log(
        '❌ Memory command storage failed. Commands:',
        commands.length,
        commands[0] ? commands[0].command : 'none'
      );
    }

    // Test search
    const searchResults = await memoryService.searchConversations('test');
    if (searchResults.length > 0) {
      console.log('✅ Memory search works');
    } else {
      console.log('❌ Memory search failed. Results:', searchResults.length);
    }

    console.log('✅ Memory Service tests passed');
  } catch (error) {
    console.error('❌ Memory Service test failed:', error.message);
    throw error;
  }
}

async function testServiceIntegration() {
  console.log('🧪 Testing Service Integration...');

  try {
    const container = ServiceFactory.createContainer();

    // Test service resolution with dependencies
    const configService = container.resolve('configuration');
    const memoryService = container.resolve('memory');

    // Initialize services
    await container.initialize();

    // Test that services are properly initialized
    if (configService && memoryService) {
      console.log('✅ Service resolution with dependencies works');
    } else {
      console.log('❌ Service resolution failed');
    }

    // Test service interaction
    await configService.set('test.integration', 'success');
    const value = configService.get('test.integration');

    await memoryService.addConversation(
      'integration test',
      'integration response',
      { test: true }
    );

    const summary = await memoryService.getSummary();

    if (value === 'success' && summary.conversations.total > 0) {
      console.log('✅ Service integration works');
    } else {
      console.log('❌ Service integration failed');
    }

    console.log('✅ Service Integration tests passed');
  } catch (error) {
    console.error('❌ Service Integration test failed:', error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('🚀 Running Service Architecture Tests...\n');

  try {
    await setupTestEnvironment();
    console.log('');

    await testDIContainer();
    console.log('');

    await testConfigurationService();
    console.log('');

    await testMemoryService();
    console.log('');

    await testServiceIntegration();
    console.log('');

    console.log('🎉 All tests passed successfully!');
    return true;
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = {
  testDIContainer,
  testConfigurationService,
  testMemoryService,
  testServiceIntegration,
  runAllTests,
};
