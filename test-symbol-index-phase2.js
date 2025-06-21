#!/usr/bin/env node

/**
 * Debug Script for Symbol Index Service - Phase 2
 *
 * This script will test the AI-enhanced symbol index and debug
 * what symbols are actually being extracted from the codebase index.
 */

const { SymbolIndexService } = require('./dist/services/SymbolIndexService.js');

// Create a mock cache service for testing
const mockCache = {
  async get(key) {
    return null; // Always cache miss for testing
  },
  async set(key, value, options) {
    console.log(`📝 Cache SET: ${key} (TTL: ${options?.ttl || 'none'})`);
  },
  async has(key) {
    return false;
  },
  async delete(key) {},
  async clear() {},
};

async function testSymbolIndexPhase2() {
  console.log('🧪 Testing Symbol Index Service - Phase 2 (AI-Enhanced)...\n');

  try {
    // Create service instance
    const symbolIndexService = new SymbolIndexService(mockCache);
    console.log('✅ SymbolIndexService instantiated successfully\n');

    // Test building from actual codebase
    console.log('🔨 Building symbol index from actual codebase...');
    const rootDir = process.cwd();
    const symbolTable = await symbolIndexService.buildSymbolIndex(rootDir, {
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
      useCache: false, // Disable cache for testing
    });

    console.log('\n📊 Symbol Index Results:');
    console.log(`   Total symbols: ${Object.keys(symbolTable.symbols).length}`);
    console.log(
      `   Total files: ${Object.keys(symbolTable.fileSymbols).length}`
    );
    console.log(
      `   Total relationships: ${Object.keys(symbolTable.relationships).length}`
    );

    // Show first 10 symbols
    const symbolNames = Object.keys(symbolTable.symbols).slice(0, 10);
    if (symbolNames.length > 0) {
      console.log('\n🔍 First 10 symbols found:');
      symbolNames.forEach((name) => {
        const symbol = symbolTable.symbols[name];
        console.log(`   - ${name} (${symbol.info.type})`);
      });
    } else {
      console.log('\n⚠️ No symbols found!');
    }

    // Test specific queries
    console.log('\n🔍 Testing specific queries:');
    const classSymbols = symbolIndexService.findSymbolsByType('class');
    const functionSymbols = symbolIndexService.findSymbolsByType('function');
    console.log(`   Classes: ${classSymbols.length}`);
    console.log(`   Functions: ${functionSymbols.length}`);

    if (classSymbols.length > 0) {
      console.log(`   First class: ${classSymbols[0]}`);
      const classDetails = symbolIndexService.getSymbol(classSymbols[0]);
      if (classDetails) {
        console.log(`     Type: ${classDetails.type}`);
        console.log(`     Definitions: ${classDetails.definitions.length}`);
        console.log(
          `     File: ${
            classDetails.definitions[0]?.location.file || 'unknown'
          }`
        );
      }
    }

    // Test patterns
    console.log('\n🎯 Testing architectural patterns:');
    console.log(
      `   Inheritance patterns: ${
        Object.keys(symbolTable.patterns.inheritance).length
      }`
    );
    console.log(
      `   Implementation patterns: ${
        Object.keys(symbolTable.patterns.implementations).length
      }`
    );
    console.log(`   Singletons: ${symbolTable.patterns.singletons.length}`);
    console.log(`   Factories: ${symbolTable.patterns.factories.length}`);

    console.log('\n🎉 Phase 2 AI-enhanced testing completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testSymbolIndexPhase2();
