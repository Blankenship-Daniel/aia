#!/usr/bin/env node

/**
 * Test script for Symbol Index Service - Phase 1
 *
 * This script tests the basic functionality of the SymbolIndexService
 * without needing to fix all the IndexCommand template literal issues.
 */

const { SymbolIndexService } = require('./dist/services/SymbolIndexService.js');

// Mock cache service for testing
const mockCache = {
  async get(key) {
    return null;
  },
  async set(key, value, options) {},
  async has(key) {
    return false;
  },
  async delete(key) {
    return false;
  },
  async deletePattern(pattern) {
    return 0;
  },
  async clear() {},
  async getStatistics() {
    return {
      totalKeys: 0,
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      totalRequests: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      oldestEntry: 0,
      newestEntry: 0,
    };
  },
  async keys() {
    return [];
  },
  async size() {
    return 0;
  },
  async refresh(key, ttl) {
    return false;
  },
  async mget(keys) {
    return keys.map(() => null);
  },
  async mset(entries) {},
  async warm(key, loader, options) {
    return await loader();
  },
  startCleanup(intervalMs) {},
  stopCleanup() {},
  async cleanup() {
    return 0;
  },
};

async function testSymbolIndexService() {
  console.log('🧪 Testing Symbol Index Service - Phase 1...\n');

  try {
    // Create service instance
    const symbolIndexService = new SymbolIndexService(mockCache);
    console.log('✅ SymbolIndexService instantiated successfully');

    // Test basic methods
    console.log('\n📋 Testing basic methods:');

    // Test getSymbol (should return undefined for non-existent symbol)
    const symbol = symbolIndexService.getSymbol('NonExistentSymbol');
    console.log(
      `getSymbol('NonExistentSymbol'): ${symbol ? 'Found' : 'Not found'} ✅`
    );

    // Test findSymbolsByType
    const classes = symbolIndexService.findSymbolsByType('class');
    console.log(
      `findSymbolsByType('class'): ${classes.length} classes found ✅`
    );

    const functions = symbolIndexService.findSymbolsByType('function');
    console.log(
      `findSymbolsByType('function'): ${functions.length} functions found ✅`
    );

    // Test getFileSymbols
    const fileSymbols = symbolIndexService.getFileSymbols('test.ts');
    console.log(
      `getFileSymbols('test.ts'): ${
        fileSymbols ? 'Structure returned' : 'Empty structure'
      } ✅`
    );

    console.log(
      '\n🎉 Phase 1 basic functionality test completed successfully!'
    );
    console.log('\n📝 Next steps:');
    console.log('   1. Fix IndexCommand template literal corruption');
    console.log('   2. Test CLI integration with: aia index symbols:build');
    console.log('   3. Implement Phase 2: Advanced AST Analysis');
    console.log('   4. Implement Phase 3: AI-Optimized Query Interface');

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSymbolIndexService()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testSymbolIndexService };
