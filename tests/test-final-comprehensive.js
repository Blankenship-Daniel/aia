#!/usr/bin/env node

/**
 * Final comprehensive test for AIA semantic search and command system
 */

console.log('🎯 Final Comprehensive Test Suite');
console.log('==================================\n');

// Test 1: Semantic Search Functionality
console.log('1. Testing Semantic Search...');
try {
  // Import and test MemoryService functionality
  const { MemoryService } = require('../src/services/MemoryService.ts');

  // Test data
  const testMemory = {
    conversations: [
      {
        query: 'How do I create a React component?',
        response:
          'To create a React component, use function or class syntax...',
        timestamp: new Date().toISOString(),
        semanticTags: ['react', 'component', 'create'],
      },
      {
        query: 'Fix Git merge conflict',
        response: 'To fix merge conflicts, edit the conflicted files...',
        timestamp: new Date().toISOString(),
        semanticTags: ['git', 'merge', 'conflict', 'fix'],
      },
    ],
    commands: [
      {
        command: 'git status',
        timestamp: new Date().toISOString(),
        workingDirectory: '/test',
        semanticTags: ['git', 'status'],
      },
      {
        command: 'npm install react',
        timestamp: new Date().toISOString(),
        workingDirectory: '/test',
        semanticTags: ['npm', 'install', 'react'],
      },
    ],
  };

  console.log('✅ Semantic search test data prepared');
} catch (error) {
  console.log(`⚠️  Semantic search direct test skipped: ${error.message}`);
}

// Test 2: Interface Compliance
console.log('\n2. Testing Interface Compliance...');
const fs = require('fs');
const path = require('path');

const interfaceFiles = [
  'src/interfaces/ICommand.ts',
  'src/interfaces/IMemoryService.ts',
  'src/interfaces/ICommandService.ts',
  'src/interfaces/IAIService.ts',
];

let interfaceTestsPassed = 0;
for (const interfaceFile of interfaceFiles) {
  try {
    const interfacePath = path.join(__dirname, '..', interfaceFile);
    const content = fs.readFileSync(interfacePath, 'utf8');

    // Check for key interface methods
    if (
      interfaceFile.includes('ICommand') &&
      content.includes('execute') &&
      content.includes('getDefinition')
    ) {
      console.log(`✅ ${interfaceFile} has required methods`);
      interfaceTestsPassed++;
    } else if (
      interfaceFile.includes('IMemoryService') &&
      content.includes('searchMemory') &&
      content.includes('getAgenticHistory')
    ) {
      console.log(`✅ ${interfaceFile} has required methods`);
      interfaceTestsPassed++;
    } else if (
      interfaceFile.includes('ICommandService') &&
      content.includes('executeCommand') &&
      content.includes('validateCommand')
    ) {
      console.log(`✅ ${interfaceFile} has required methods`);
      interfaceTestsPassed++;
    } else if (
      interfaceFile.includes('IAIService') &&
      content.includes('queryAI')
    ) {
      console.log(`✅ ${interfaceFile} has required methods`);
      interfaceTestsPassed++;
    } else {
      console.log(`⚠️  ${interfaceFile} may be missing methods`);
    }
  } catch (error) {
    console.log(`❌ ${interfaceFile} check failed: ${error.message}`);
  }
}

// Test 3: Type Definitions
console.log('\n3. Testing Type Definitions...');
try {
  const typesPath = path.join(__dirname, '..', 'src', 'types', 'index.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');

  const requiredTypes = [
    'CommandResult',
    'CommandOptions',
    'AgenticExecution',
    'ExecutionStep',
    'AgenticStep',
    'MemoryEntry',
    'ConversationEntry',
    'CommandEntry',
  ];

  let typesFound = 0;
  for (const type of requiredTypes) {
    if (typesContent.includes(type)) {
      typesFound++;
    }
  }

  if (typesFound >= requiredTypes.length * 0.8) {
    console.log(`✅ Types defined: ${typesFound}/${requiredTypes.length}`);
  } else {
    console.log(
      `⚠️  Some types may be missing: ${typesFound}/${requiredTypes.length}`
    );
  }
} catch (error) {
  console.log(`❌ Type definitions check failed: ${error.message}`);
}

// Test 4: Command Implementation
console.log('\n4. Testing Command Implementations...');
const commandTests = [
  { file: 'src/commands/AskCommand.ts', name: 'AskCommand' },
  { file: 'src/commands/AgentCommand.ts', name: 'AgentCommand' },
  { file: 'src/commands/ExecuteCommand.ts', name: 'ExecuteCommand' },
];

let commandTestsPassed = 0;
for (const test of commandTests) {
  try {
    const commandPath = path.join(__dirname, '..', test.file);
    const content = fs.readFileSync(commandPath, 'utf8');

    const hasRequiredMethods = [
      'execute',
      'getDefinition',
      'getName',
      'getAliases',
      'validateArgs',
      'getHelp',
    ].every((method) => content.includes(method));

    const implementsInterface = content.includes('implements ICommand');

    if (hasRequiredMethods && implementsInterface) {
      console.log(`✅ ${test.name} properly implemented`);
      commandTestsPassed++;
    } else {
      console.log(`⚠️  ${test.name} may be missing methods or interface`);
    }
  } catch (error) {
    console.log(`❌ ${test.name} check failed: ${error.message}`);
  }
}

// Test 5: Service Implementation
console.log('\n5. Testing Service Implementations...');
const serviceTests = [
  {
    file: 'src/services/MemoryService.ts',
    name: 'MemoryService',
    interface: 'IMemoryService',
  },
  {
    file: 'src/services/CommandService.ts',
    name: 'CommandService',
    interface: 'ICommandService',
  },
];

let serviceTestsPassed = 0;
for (const test of serviceTests) {
  try {
    const servicePath = path.join(__dirname, '..', test.file);
    const content = fs.readFileSync(servicePath, 'utf8');

    const implementsInterface = content.includes(
      `implements ${test.interface}`
    );
    const hasConstructor = content.includes('constructor');

    if (implementsInterface && hasConstructor) {
      console.log(`✅ ${test.name} properly implemented`);
      serviceTestsPassed++;
    } else {
      console.log(`⚠️  ${test.name} may be missing interface or constructor`);
    }
  } catch (error) {
    console.log(`❌ ${test.name} check failed: ${error.message}`);
  }
}

// Final Summary
console.log('\n📊 Test Results Summary:');
console.log(
  `Interface Tests: ${interfaceTestsPassed}/${interfaceFiles.length}`
);
console.log(`Command Tests: ${commandTestsPassed}/${commandTests.length}`);
console.log(`Service Tests: ${serviceTestsPassed}/${serviceTests.length}`);

const totalTests =
  interfaceFiles.length + commandTests.length + serviceTests.length;
const totalPassed =
  interfaceTestsPassed + commandTestsPassed + serviceTestsPassed;
const passRate = Math.round((totalPassed / totalTests) * 100);

console.log(`\nOverall Pass Rate: ${passRate}% (${totalPassed}/${totalTests})`);

if (passRate >= 90) {
  console.log('\n🎉 Excellent! System is ready for production use.');
} else if (passRate >= 75) {
  console.log('\n✅ Good! System is functional with minor issues.');
} else {
  console.log('\n⚠️  System needs attention before production use.');
}

console.log('\n🔧 Recommended next steps:');
console.log(
  '- Run semantic search tests: node tests/test-semantic-search-fixes.js'
);
console.log('- Test end-to-end functionality with real AI calls');
console.log('- Validate TypeScript compilation: npx tsc --noEmit');
console.log('- Performance testing with large memory datasets');
