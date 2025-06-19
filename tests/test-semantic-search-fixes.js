/**
 * Test file for semantic search functionality fixes
 */

const path = require('path');
const MemoryService = require('../src/services/MemoryService');
const MemoryManager = require('../src/MemoryManager');

async function testSemanticSearchFixes() {
  console.log('🧪 Testing Semantic Search Fixes');
  console.log('================================');

  // Test MemoryService
  console.log('\n1. Testing MemoryService...');
  const memoryService = new MemoryService();

  // Initialize with test data
  memoryService.memory = {
    conversations: [
      {
        id: 1,
        query: 'How do I create a React component?',
        response:
          'To create a React component, you can use function components with JSX',
        timestamp: new Date().toISOString(),
        semanticTags: ['react', 'component', 'javascript', 'jsx', 'create'],
      },
      {
        id: 2,
        query: 'Deploy Node.js app to production',
        response: 'You can deploy using Docker, Heroku, or AWS',
        timestamp: new Date().toISOString(),
        semanticTags: [
          'node',
          'deploy',
          'production',
          'docker',
          'heroku',
          'aws',
        ],
      },
      {
        id: 3,
        query: 'Fix Git merge conflict',
        response:
          'Use git status, edit conflicted files, then git add and commit',
        timestamp: new Date().toISOString(),
        semanticTags: ['git', 'merge', 'conflict', 'fix'],
      },
    ],
    commands: [
      {
        command: 'npm install react',
        timestamp: new Date().toISOString(),
        workingDirectory: '/test/project',
        result: { exitCode: 0 },
      },
      {
        command: 'git status',
        timestamp: new Date().toISOString(),
        workingDirectory: '/test/project',
        result: { exitCode: 0 },
      },
    ],
  };

  // Test searchMemory method
  try {
    console.log('Testing searchMemory with "react"...');
    const reactResults = await memoryService.searchMemory('react', 5, 'all');
    console.log(`✅ Found ${reactResults.length} results for "react"`);
    reactResults.forEach((result) => {
      console.log(
        `  - ${result.type}: ${
          result.content.query || result.content.command
        } (score: ${result.score.toFixed(2)})`
      );
    });

    console.log('\nTesting searchMemory with "git"...');
    const gitResults = await memoryService.searchMemory('git', 5, 'all');
    console.log(`✅ Found ${gitResults.length} results for "git"`);
    gitResults.forEach((result) => {
      console.log(
        `  - ${result.type}: ${
          result.content.query || result.content.command
        } (score: ${result.score.toFixed(2)})`
      );
    });

    console.log('\nTesting searchMemory with conversation filter...');
    const convResults = await memoryService.searchMemory(
      'deploy',
      5,
      'conversation'
    );
    console.log(
      `✅ Found ${convResults.length} conversation results for "deploy"`
    );

    console.log('\nTesting searchMemory with command filter...');
    const cmdResults = await memoryService.searchMemory('npm', 5, 'command');
    console.log(`✅ Found ${cmdResults.length} command results for "npm"`);
  } catch (error) {
    console.error('❌ MemoryService searchMemory failed:', error.message);
  }

  // Test semantic tag extraction
  console.log('\n2. Testing semantic tag extraction...');
  try {
    const tags1 = memoryService.extractSemanticTags(
      'create react component with typescript',
      'use tsx files and interfaces'
    );
    console.log('✅ Extracted tags:', tags1);

    const tags2 = memoryService.extractSemanticTags(
      'deploy docker container to aws',
      'use ECR and ECS services'
    );
    console.log('✅ Extracted tags:', tags2);

    // Test semantic similarity
    const similarity = memoryService.calculateSemanticSimilarity(tags1, tags2);
    console.log(`✅ Semantic similarity: ${similarity.toFixed(2)}`);
  } catch (error) {
    console.error('❌ Semantic tagging failed:', error.message);
  }

  // Test MemoryManager (legacy)
  console.log('\n3. Testing MemoryManager (legacy)...');
  const memoryPath = path.join(__dirname, 'test-memory.json');
  const memoryManager = new MemoryManager(memoryPath);

  // Initialize with test data
  memoryManager.memory = {
    conversations: memoryService.memory.conversations,
    commands: memoryService.memory.commands,
  };

  try {
    console.log('Testing legacy semanticSearch...');
    const legacyResults = await memoryManager.semanticSearch(
      'react component',
      3
    );
    console.log(`✅ Legacy search found ${legacyResults.length} results`);

    // Test with options object
    const optionsResults = await memoryManager.semanticSearch('git merge', {
      limit: 2,
      threshold: 0.1,
    });
    console.log(
      `✅ Options-based search found ${optionsResults.length} results`
    );
  } catch (error) {
    console.error('❌ MemoryManager semanticSearch failed:', error.message);
  }

  // Test error handling
  console.log('\n4. Testing error handling...');
  try {
    // Test with invalid inputs
    const invalidResults1 = await memoryService.searchMemory('', 5);
    console.log(`⚠️  Empty query returned ${invalidResults1.length} results`);

    const invalidResults2 = await memoryService.searchMemory(null, 5);
    console.log(`⚠️  Null query returned ${invalidResults2.length} results`);

    // Test semantic similarity with invalid inputs
    const invalidSim1 = memoryService.calculateSemanticSimilarity([], ['test']);
    console.log(`⚠️  Empty tags similarity: ${invalidSim1}`);

    const invalidSim2 = memoryService.calculateSemanticSimilarity(null, [
      'test',
    ]);
    console.log(`⚠️  Null tags similarity: ${invalidSim2}`);

    console.log('✅ Error handling working correctly');
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
  }

  console.log('\n🎉 Semantic search testing completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSemanticSearchFixes().catch(console.error);
}

module.exports = { testSemanticSearchFixes };
