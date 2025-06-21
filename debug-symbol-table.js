#!/usr/bin/env node

/**
 * Debug Script: Inspect Symbol Lookup Table
 *
 * This script inspects the actual symbol lookup table to debug the issue
 */

const { DIContainer } = require('./dist/container/DIContainer');
const { ServiceFactory } = require('./dist/container/ServiceFactory');

async function inspectSymbolLookupTable() {
  console.log('🔍 Inspecting Symbol Lookup Table...\n');

  try {
    const container = ServiceFactory.createContainer();
    const symbolIndexService = container.resolve('symbolIndex');

    console.log('🔨 Building symbol index...');
    const symbolTable = await symbolIndexService.buildSymbolIndex(
      process.cwd(),
      {
        useCache: false,
      }
    );

    console.log('📊 Lookup table keys:', Object.keys(symbolTable));
    console.log(
      '📊 Symbol count:',
      Object.keys(symbolTable.symbols || {}).length
    );

    if (symbolTable.symbols) {
      console.log('\n🎯 First 10 symbol names:');
      const symbolNames = Object.keys(symbolTable.symbols).slice(0, 10);
      symbolNames.forEach((name, i) => {
        console.log(
          `  ${i + 1}. ${name} (${symbolTable.symbols[name].info.type})`
        );
      });

      // Test lookup of a real symbol
      if (symbolNames.length > 0) {
        const testSymbol =
          symbolNames.find((name) => name !== 'metadata') || symbolNames[0];
        console.log(`\n🔍 Testing lookup of '${testSymbol}':`);

        const result = symbolIndexService.getSymbol(testSymbol);
        console.log(
          'Result:',
          result ? `Found: ${result.name} (${result.type})` : 'Not found'
        );
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
    process.exit(1);
  }
}

inspectSymbolLookupTable().catch(console.error);
