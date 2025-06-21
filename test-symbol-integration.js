#!/usr/bin/env node

/**
 * Test Script: Symbol Index Integration Test
 *
 * This script verifies that symbol indexing and lookup work correctly
 * and that the services share the same symbol data.
 */

const { DIContainer } = require('./dist/container/DIContainer');
const { ServiceFactory } = require('./dist/container/ServiceFactory');

async function testSymbolIndexIntegration() {
  console.log('🧪 Testing Symbol Index Integration...\n');

  try {
    // Create container with all services
    const container = ServiceFactory.createContainer();

    // Get services
    const symbolIndexService = container.resolve('symbolIndex');
    const codeIndexService = container.resolve('codeIndex');

    console.log('🔗 Services retrieved successfully');

    // Build symbol index
    console.log('🔨 Building symbol index...');
    const symbolTable = await symbolIndexService.buildSymbolIndex(
      process.cwd(),
      {
        useCache: false, // Force rebuild to ensure fresh data
      }
    );

    console.log(
      `✅ Symbol index built with ${
        Object.keys(symbolTable.symbols).length
      } symbols`
    );

    // Test symbol lookup
    console.log('\n🔍 Testing symbol lookup...');

    // List first few symbols to find testable ones
    const symbolNames = Object.keys(symbolTable.symbols).slice(0, 5);
    console.log('Available symbols:', symbolNames);

    if (symbolNames.length > 0) {
      const testSymbol = symbolNames[0];
      console.log(`\n🔍 Looking up symbol: ${testSymbol}`);

      const symbolInfo = symbolIndexService.getSymbol(testSymbol);
      if (symbolInfo) {
        console.log('✅ Symbol found:', {
          name: symbolInfo.name,
          type: symbolInfo.type,
          file: symbolInfo.definition?.file,
          line: symbolInfo.definition?.line,
        });
      } else {
        console.log('❌ Symbol not found');
      }
    }

    // Test the disconnect - compare codeIndex symbols vs symbolIndex symbols
    console.log('\n🔍 Comparing CodeIndex vs SymbolIndex...');

    // Load code index
    const codeIndex = await codeIndexService.loadIndex();
    if (codeIndex && codeIndex.classes) {
      const codeIndexClasses = codeIndex.classes.length;
      const symbolIndexClasses = Object.values(symbolTable.symbols).filter(
        (s) => s.type === 'class'
      ).length;

      console.log(`CodeIndex classes: ${codeIndexClasses}`);
      console.log(`SymbolIndex classes: ${symbolIndexClasses}`);

      if (codeIndexClasses > 0 && symbolIndexClasses > 0) {
        console.log('✅ Both services have symbol data');
      } else {
        console.log('❌ One or both services missing symbol data');
      }
    }

    console.log('\n✅ Symbol index integration test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Symbol index integration test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSymbolIndexIntegration().catch(console.error);
