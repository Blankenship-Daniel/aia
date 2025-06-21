#!/usr/bin/env node

/**
 * Test Script for Symbol Index CLI Integration - Phase 2
 *
 * This script tests the full CLI workflow: build and query
 */

const { SymbolIndexService } = require('./dist/services/SymbolIndexService.js');

// Mock cache that actually stores data
const cache = new Map();
const mockCache = {
  async get(key) {
    return cache.get(key) || null;
  },
  async set(key, value, options) {
    console.log(`📝 Cache SET: ${key}`);
    cache.set(key, value);
  },
  async has(key) {
    return cache.has(key);
  },
  async delete(key) {
    return cache.delete(key);
  },
  async clear() {
    cache.clear();
  },
};

async function testFullWorkflow() {
  console.log('🧪 Testing Symbol Index CLI Integration - Phase 2...\n');

  try {
    // Create service instance
    const symbolIndexService = new SymbolIndexService(mockCache);
    console.log('✅ SymbolIndexService instantiated successfully\n');

    // Step 1: Build the index
    console.log('🔨 Step 1: Building symbol index...');
    const rootDir = process.cwd();
    const symbolTable = await symbolIndexService.buildSymbolIndex(rootDir, {
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
      useCache: true,
    });

    console.log(
      `   ✅ Built index with ${
        Object.keys(symbolTable.symbols).length
      } symbols\n`
    );

    // Step 2: Test queries on the same instance
    console.log('🔍 Step 2: Testing queries on same service instance...');

    // Query for a known class
    const classSymbols = symbolIndexService.findSymbolsByType('class');
    console.log(`   Found ${classSymbols.length} classes`);

    if (classSymbols.length > 0) {
      const firstClass = classSymbols[0];
      console.log(`   Testing query for: ${firstClass}`);

      const symbolInfo = symbolIndexService.getSymbol(firstClass);
      if (symbolInfo) {
        console.log(
          `   ✅ Found symbol: ${symbolInfo.name} (${symbolInfo.type})`
        );
        console.log(
          `      File: ${symbolInfo.definitions[0]?.location.file || 'unknown'}`
        );
        console.log(
          `      Relationships: ${symbolInfo.relationships.uses.length} uses, ${symbolInfo.relationships.usedBy.length} used by`
        );
      } else {
        console.log(`   ❌ Symbol not found: ${firstClass}`);
      }
    }

    // Test a specific well-known symbol
    console.log('\n🎯 Step 3: Testing specific symbol queries...');
    const knownSymbols = [
      'AgenticReasoningEngine',
      'SymbolIndexService',
      'AIService',
      'ConfigurationService',
    ];

    for (const symbolName of knownSymbols) {
      const found = symbolIndexService.getSymbol(symbolName);
      if (found) {
        console.log(
          `   ✅ Found: ${symbolName} (${found.type}) in ${found.definitions[0]?.location.file}`
        );
      } else {
        console.log(`   ❌ Not found: ${symbolName}`);
      }
    }

    // Step 4: Test cache functionality
    console.log('\n💾 Step 4: Testing cache functionality...');
    const cacheHit = await symbolIndexService.buildSymbolIndex(rootDir, {
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
      useCache: true,
    });

    if (cacheHit === symbolTable) {
      console.log('   ✅ Cache hit detected - same object returned');
    } else {
      console.log('   ❌ Cache miss - new object created');
    }

    console.log('\n🎉 Full workflow testing completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testFullWorkflow();
