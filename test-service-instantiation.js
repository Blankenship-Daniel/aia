#!/usr/bin/env node

/**
 * Test Script: Service Instantiation Test
 *
 * This script verifies that services are properly instantiated with DI
 */

const { DIContainer } = require('./dist/container/DIContainer');
const { ServiceFactory } = require('./dist/container/ServiceFactory');

async function testServiceInstantiation() {
  console.log('🧪 Testing Service Instantiation with DI...\n');

  try {
    // Create container with all services
    const container = ServiceFactory.createContainer();

    // Test getting symbol index service
    console.log('🔗 Getting symbolIndex service...');
    const symbolIndexService = container.resolve('symbolIndex');
    console.log(
      '✅ SymbolIndexService instantiated:',
      symbolIndexService.constructor.name
    );

    // Test getting code index service
    console.log('🔗 Getting codeIndex service...');
    const codeIndexService = container.resolve('codeIndex');
    console.log(
      '✅ CodeIndexService instantiated:',
      codeIndexService.constructor.name
    );

    // Test getting command factory
    console.log('🔗 Getting commandFactory service...');
    const commandFactory = container.resolve('commandFactory');
    console.log(
      '✅ CommandFactory instantiated:',
      commandFactory.constructor.name
    );

    // Test creating index command
    console.log('🔗 Creating index command...');
    const indexCommand = commandFactory.createCommand('index');
    console.log('✅ IndexCommand instantiated:', indexCommand.constructor.name);

    // Check if the command has the expected services
    console.log('\n🔍 Checking IndexCommand dependencies...');
    console.log(
      '- Has codeIndexService:',
      indexCommand.codeIndexService ? '✅' : '❌'
    );
    console.log(
      '- Has symbolIndexService:',
      indexCommand.symbolIndexService ? '✅' : '❌'
    );
    console.log(
      '- Has codebaseSummarizer:',
      indexCommand.codebaseSummarizer ? '✅' : '❌'
    );
    console.log(
      '- Has semanticAnalyzer:',
      indexCommand.semanticAnalyzer ? '✅' : '❌'
    );

    console.log('\n✅ Service instantiation test completed successfully!');

    // Force exit to avoid hanging due to background timers in services
    process.exit(0);
  } catch (error) {
    console.error('❌ Service instantiation test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testServiceInstantiation().catch(console.error);
