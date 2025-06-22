#!/usr/bin/env node

const {
  CopilotContextEnhancer,
} = require('./.vscode/aia-copilot-bridge/out/copilotContextProvider');
const path = require('path');

async function testCopilotContext() {
  console.log('🧪 Testing Copilot Context Generation...\n');

  try {
    const workspaceRoot = process.cwd();
    const enhancer = new CopilotContextEnhancer(workspaceRoot);

    console.log('🔄 Generating Copilot context files...');
    await enhancer.enhanceCopilotContext();

    console.log('✅ Copilot context generation completed!');

    // Check if context files were created
    const fs = require('fs-extra');
    const contextFiles = [
      '.github/copilot-context.md',
      '.github/copilot-symbols.json',
      '.github/symbol-relationships.json',
    ];

    for (const file of contextFiles) {
      if (await fs.pathExists(file)) {
        console.log(`✅ Generated: ${file}`);
      } else {
        console.log(`❌ Missing: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCopilotContext();
