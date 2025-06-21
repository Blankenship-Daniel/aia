#!/usr/bin/env node

/**
 * Test Script: Single Command Build and Query
 *
 * This script tests building and querying in a single execution
 */

const { DIContainer } = require('./dist/container/DIContainer');
const { ServiceFactory } = require('./dist/container/ServiceFactory');

async function testSingleCommandBuildAndQuery() {
  console.log('🔄 Testing Build and Query in Single Execution...\n');

  try {
    const container = ServiceFactory.createContainer();
    const commandFactory = container.resolve('commandFactory');
    const indexCommand = commandFactory.createCommand('index');

    // Build symbol index
    console.log('🔨 Building symbol index...');
    await indexCommand.symbolIndexService.buildSymbolIndex(process.cwd(), {
      useCache: false,
    });

    // Immediately query
    console.log('\n🔍 Querying AgenticReasoningEngine...');
    const result = indexCommand.symbolIndexService.getSymbol(
      'AgenticReasoningEngine'
    );
    console.log(
      'Result:',
      result ? `✅ Found: ${result.name} (${result.type})` : '❌ Not found'
    );

    // Test another symbol
    console.log('\n🔍 Querying SymbolIndexService...');
    const result2 =
      indexCommand.symbolIndexService.getSymbol('SymbolIndexService');
    console.log(
      'Result:',
      result2 ? `✅ Found: ${result2.name} (${result2.type})` : '❌ Not found'
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Single command test failed:', error.message);
    process.exit(1);
  }
}

testSingleCommandBuildAndQuery().catch(console.error);
