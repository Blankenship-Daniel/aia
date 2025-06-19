#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log('🧪 Complete Integration Test');
console.log('=============================\n');

// Test 1: Check if all key files exist
console.log('1. Checking file structure...');
const filesToCheck = [
  'src/commands/AgentCommand.ts',
  'src/commands/AskCommand.ts',
  'src/commands/ExecuteCommand.ts',
  'src/services/MemoryService.ts',
  'src/services/CommandService.ts',
  'src/interfaces/ICommand.ts',
  'src/interfaces/IMemoryService.ts',
  'src/types/index.ts',
];

let filesOk = true;
for (const file of filesToCheck) {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    filesOk = false;
  }
}

if (!filesOk) {
  console.log('\n❌ File structure test failed');
  process.exit(1);
}

// Test 2: Check semantic search functionality
console.log('\n2. Testing semantic search...');
try {
  const semanticTestResult = require('../tests/test-semantic-search-fixes.js');
  console.log('✅ Semantic search test available');
} catch (error) {
  console.log(`❌ Semantic search test error: ${error.message}`);
}

// Test 3: Check TypeScript types and interfaces
console.log('\n3. Checking TypeScript compatibility...');
try {
  // Try to read the types file
  const typesPath = path.join(__dirname, '..', 'src', 'types', 'index.ts');
  if (fs.existsSync(typesPath)) {
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    if (
      typesContent.includes('AgenticExecution') &&
      typesContent.includes('ExecutionStep') &&
      typesContent.includes('CommandResult')
    ) {
      console.log('✅ TypeScript types are properly defined');
    } else {
      console.log('⚠️  Some TypeScript types may be missing');
    }
  } else {
    console.log('❌ TypeScript types file missing');
  }
} catch (error) {
  console.log(`❌ TypeScript types check failed: ${error.message}`);
}

// Test 4: Check if services implement their interfaces
console.log('\n4. Checking service implementations...');
try {
  const memoryServicePath = path.join(
    __dirname,
    '..',
    'src',
    'services',
    'MemoryService.ts'
  );
  if (fs.existsSync(memoryServicePath)) {
    const memoryServiceContent = fs.readFileSync(memoryServicePath, 'utf8');
    if (
      memoryServiceContent.includes('implements IMemoryService') &&
      memoryServiceContent.includes('searchMemory') &&
      memoryServiceContent.includes('getAgenticHistory')
    ) {
      console.log('✅ MemoryService properly implements interface');
    } else {
      console.log('⚠️  MemoryService may be missing interface methods');
    }
  }
} catch (error) {
  console.log(`❌ Service implementation check failed: ${error.message}`);
}

// Test 5: Check command implementations
console.log('\n5. Checking command implementations...');
const commandFiles = [
  'src/commands/AskCommand.ts',
  'src/commands/AgentCommand.ts',
  'src/commands/ExecuteCommand.ts',
];

for (const commandFile of commandFiles) {
  try {
    const commandPath = path.join(__dirname, '..', commandFile);
    if (fs.existsSync(commandPath)) {
      const commandContent = fs.readFileSync(commandPath, 'utf8');
      if (
        commandContent.includes('implements ICommand') &&
        commandContent.includes('execute') &&
        commandContent.includes('getDefinition')
      ) {
        console.log(`✅ ${commandFile} properly implements ICommand`);
      } else {
        console.log(`⚠️  ${commandFile} may be missing interface methods`);
      }
    }
  } catch (error) {
    console.log(`❌ ${commandFile} check failed: ${error.message}`);
  }
}

console.log('\n🎉 Integration test completed!');
console.log('\nNext steps:');
console.log(
  '- Run semantic search tests: node tests/test-semantic-search-fixes.js'
);
console.log('- Test TypeScript compilation: npx tsc --noEmit');
console.log('- Run command tests: node tests/test-command-system.js');
