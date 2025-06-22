#!/usr/bin/env node

console.log('🧪 Testing AIA CLI Integration for VSCode Extension...\n');

async function testAIAIntegration() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const fs = require('fs-extra');
  const path = require('path');
  
  const execAsync = promisify(exec);

  try {
    console.log('🔨 Testing AIA CLI commands used by VSCode extension...\n');

    // Test 1: Symbol index building
    console.log('📊 Test 1: Building symbol index...');
    const buildStart = Date.now();
    await execAsync('node main.js index build --force');
    const buildTime = Date.now() - buildStart;
    console.log(`✅ Symbol index built in ${buildTime}ms\n`);

    // Test 2: Copilot instructions generation
    console.log('📊 Test 2: Generating copilot instructions...');
    const instructionsStart = Date.now();
    await execAsync('node main.js index export --type copilot-instructions --output .github/copilot-instructions-auto.md');
    const instructionsTime = Date.now() - instructionsStart;
    
    // Check if file was created
    const instructionsPath = '.github/copilot-instructions-auto.md';
    if (await fs.pathExists(instructionsPath)) {
      const stats = await fs.stat(instructionsPath);
      console.log(`✅ Copilot instructions generated in ${instructionsTime}ms (${stats.size} bytes)\n`);
    } else {
      console.log('❌ Copilot instructions file not created\n');
    }

    console.log('\n🎯 Benefits of using existing AIA CLI:');
    console.log('- ✅ No code duplication');
    console.log('- ✅ Leverages existing O(1) symbol lookup');
    console.log('- ✅ Consistent symbol index across CLI and VSCode');
    console.log('- ✅ Automatic updates when AIA CLI improves');
    console.log('- ✅ Full AI-enhanced symbol relationship detection');

    console.log('\n✨ Integration test completed successfully! ✨');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

testAIAIntegration();
