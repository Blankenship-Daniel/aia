#!/usr/bin/env node

/**
 * Test Script: Service State Sharing Test
 *
 * This script tests if services maintain state between commands
 */

const { DIContainer } = require('./dist/container/DIContainer');
const { ServiceFactory } = require('./dist/container/ServiceFactory');

async function testServiceStateSharing() {
  console.log('🔄 Testing Service State Sharing...\n');

  try {
    const container = ServiceFactory.createContainer();

    // Get command factory
    const commandFactory = container.resolve('commandFactory');

    // Create two separate IndexCommand instances
    console.log('🔨 Creating first IndexCommand instance...');
    const indexCommand1 = commandFactory.createCommand('index');

    console.log('🔨 Creating second IndexCommand instance...');
    const indexCommand2 = commandFactory.createCommand('index');

    console.log('\n🔍 Checking if they share the same services...');
    console.log(
      'Same symbolIndexService?',
      indexCommand1.symbolIndexService === indexCommand2.symbolIndexService
    );
    console.log(
      'Same codeIndexService?',
      indexCommand1.codeIndexService === indexCommand2.codeIndexService
    );

    // Build symbol index with first instance
    console.log('\n🔨 Building symbol index with first instance...');
    await indexCommand1.symbolIndexService.buildSymbolIndex(process.cwd(), {
      useCache: false,
    });

    console.log(
      'First instance symbol count:',
      Object.keys(indexCommand1.symbolIndexService.lookupTable?.symbols || {})
        .length
    );
    console.log(
      'Second instance symbol count:',
      Object.keys(indexCommand2.symbolIndexService.lookupTable?.symbols || {})
        .length
    );

    // Try to query with second instance
    console.log('\n🔍 Querying with second instance...');
    const testSymbolName = 'AgenticReasoningEngine';
    const result = indexCommand2.symbolIndexService.getSymbol(testSymbolName);
    console.log(
      `Query result for '${testSymbolName}':`,
      result ? `Found: ${result.name}` : 'Not found'
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ State sharing test failed:', error.message);
    process.exit(1);
  }
}

testServiceStateSharing().catch(console.error);
