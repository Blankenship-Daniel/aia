#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

async function testSymbolIndex() {
  console.log('🧪 Testing AIA Symbol Index Integration...\n');

  try {
    // Test 1: Check if symbol index exists
    const indexPath = path.join(process.cwd(), '.aia', 'codebase-index.json');
    console.log(`Looking for symbol index at: ${indexPath}`);

    if (await fs.pathExists(indexPath)) {
      console.log('✅ Symbol index file found');

      // Load and analyze the index
      const index = await fs.readJson(indexPath);
      console.log(`📊 Index metadata:`, index.metadata);

      // Extract symbols from files structure
      const files = index.files || [];
      let totalSymbols = 0;
      const symbolsByType = {};

      for (const [filePath, fileData] of files) {
        const symbols = fileData.symbols || [];
        totalSymbols += symbols.length;

        for (const symbol of symbols) {
          if (symbol.type) {
            symbolsByType[symbol.type] = (symbolsByType[symbol.type] || 0) + 1;
          }
        }
      }

      console.log(`📊 Total symbols: ${totalSymbols}`);
      console.log(`📊 Symbols by type:`, symbolsByType);

      // Test some specific symbols
      const testSymbols = [
        'AgenticReasoningEngine',
        'MemoryManager',
        'ConfigurationManager',
      ];
      for (const testSymbol of testSymbols) {
        let found = false;
        for (const [filePath, fileData] of files) {
          const symbols = fileData.symbols || [];
          if (symbols.some((s) => s.name === testSymbol)) {
            console.log(`✅ Found symbol: ${testSymbol} in ${filePath}`);
            found = true;
            break;
          }
        }
        if (!found) {
          console.log(`❌ Missing symbol: ${testSymbol}`);
        }
      }
    } else {
      console.log('❌ Symbol index file not found');
    }

    // Test 2: Check VSCode extension files
    console.log('\n📊 VSCode Extension Files:');
    const extensionPath = '.vscode/aia-copilot-bridge';
    const extensionFiles = [
      'package.json',
      'out/extension.js',
      'out/symbolProvider.js',
      'out/performanceMonitor.js',
      'out/copilotContextProvider.js',
    ];

    for (const file of extensionFiles) {
      const filePath = path.join(extensionPath, file);
      if (await fs.pathExists(filePath)) {
        console.log(`✅ Found: ${file}`);
      } else {
        console.log(`❌ Missing: ${file}`);
      }
    }

    console.log('\n🎉 Test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSymbolIndex();
