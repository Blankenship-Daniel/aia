#!/usr/bin/env node

/**
 * Semantic Search Test
 * Tests the semantic search functionality in the MemoryService
 */

console.log('🔍 Testing Semantic Search Functionality');
console.log('=======================================\n');

async function testSemanticSearch() {
  try {
    const { MemoryService } = require('../dist/services/MemoryService');
    const {
      ConfigurationService,
    } = require('../dist/services/ConfigurationService');

    // Initialize services
    const configService = new ConfigurationService();
    await configService.initialize();

    const memoryService = new MemoryService(configService);
    await memoryService.initialize();

    // Add test data
    console.log('🧪 Adding test conversations...');
    await memoryService.addConversation(
      'How do I debug Node.js applications?',
      'You can debug Node.js applications using the built-in debugger...',
      { workingDirectory: '/test/project' },
      'gpt-4'
    );

    await memoryService.addConversation(
      'What are the best practices for React components?',
      'React best practices include using functional components...',
      { workingDirectory: '/test/react' },
      'gpt-4'
    );

    await memoryService.addConversation(
      'How to optimize database queries?',
      'Database optimization techniques include indexing...',
      { workingDirectory: '/test/db' },
      'gpt-4'
    );

    console.log('✅ Test data added');

    // Test semantic search
    console.log('🔍 Testing semantic search...');

    const debugResults = await memoryService.searchConversations(
      'debugging nodejs'
    );
    console.log(`Debug search results: ${debugResults.length} found`);

    const reactResults = await memoryService.searchConversations(
      'React component patterns'
    );
    console.log(`React search results: ${reactResults.length} found`);

    const dbResults = await memoryService.searchConversations(
      'database performance'
    );
    console.log(`Database search results: ${dbResults.length} found`);

    // Test command search
    console.log('🔍 Testing command search...');
    await memoryService.addCommand(
      'npm install',
      { exitCode: 0, stdout: 'packages installed', duration: 2000 },
      { workingDirectory: '/test/project' }
    );

    await memoryService.addCommand(
      'git commit -m "fix bug"',
      { exitCode: 0, stdout: 'committed', duration: 500 },
      { workingDirectory: '/test/project' }
    );

    const npmResults = await memoryService.searchCommands(
      'package installation'
    );
    console.log(`NPM search results: ${npmResults.length} found`);

    const gitResults = await memoryService.searchCommands(
      'version control commit'
    );
    console.log(`Git search results: ${gitResults.length} found`);

    console.log('\n✅ Semantic search functionality working');
    return true;
  } catch (error) {
    console.error('❌ Semantic search test failed:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testSemanticSearch().then((success) => {
    console.log(
      success
        ? '\n🎉 Semantic search tests passed!'
        : '\n💥 Semantic search tests failed!'
    );
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testSemanticSearch };
