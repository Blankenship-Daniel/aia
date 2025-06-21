#!/usr/bin/env node

/**
 * Test Script: Symbol Index CLI Integration Test
 *
 * This script verifies that CLI commands for symbol indexing work correctly
 * with dependency injection and shared state.
 */

const { DIContainer } = require('./dist/container/DIContainer');
const { ServiceFactory } = require('./dist/container/ServiceFactory');

async function testCLIIntegration() {
  console.log('🧪 Testing CLI Integration with Dependency Injection...\n');

  try {
    // Create container with all services
    const container = ServiceFactory.createContainer();

    // Get the command factory (which should have DI)
    const commandFactory = container.resolve('commandFactory');

    // Get an index command instance
    const indexCommand = commandFactory.createCommand('index');

    console.log('✅ Command factory and index command created successfully'); // Test building symbol index
    console.log('\n🔨 Testing symbol index build...');
    await indexCommand.execute(['symbols:build'], { force: true });

    console.log('\n🔍 Testing symbol query...');
    await indexCommand.execute(['symbols:query', 'SymbolIndexService'], {
      force: true,
    });

    console.log('\n✅ CLI integration test completed successfully!');
  } catch (error) {
    console.error('❌ CLI integration test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testCLIIntegration().catch(console.error);
