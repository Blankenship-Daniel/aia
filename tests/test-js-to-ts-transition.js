#!/usr/bin/env node

/**
 * Final validation test after JS->TS transition
 * Tests that CLI and core functionality still work after removing JS files
 */

console.log('🎯 Final JS->TS Transition Validation');
console.log('====================================\n');

const { execSync, spawn } = require('child_process');
const path = require('path');

async function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`🧪 Testing: ${description}`);
    console.log(`   Command: ${command}`);

    const child = spawn('sh', ['-c', command], {
      cwd: __dirname,
      stdio: 'pipe',
      timeout: 10000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} - PASSED`);
        resolve({ stdout, stderr, code });
      } else {
        console.log(`❌ ${description} - FAILED (exit code: ${code})`);
        if (stderr) console.log(`   Error: ${stderr.substring(0, 200)}...`);
        resolve({ stdout, stderr, code });
      }
    });

    child.on('error', (error) => {
      console.log(`❌ ${description} - ERROR: ${error.message}`);
      resolve({ stdout: '', stderr: error.message, code: 1 });
    });
  });
}

async function main() {
  const tests = [
    {
      command: 'cd .. && node main.js --help',
      description: 'CLI Help Command',
    },
    {
      command: 'cd .. && echo "timeout 5 node main.js config --list" | sh',
      description: 'Config Command',
    },
    {
      command: 'cd .. && npm run type-check',
      description: 'TypeScript Type Checking',
    },
    {
      command: 'cd .. && npm run build',
      description: 'TypeScript Build Process',
    },
    {
      command: 'node test-command-system.js',
      description: 'Command System Tests',
    },
    {
      command: 'node test-complete-integration.js',
      description: 'Integration Tests',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await runCommand(test.command, test.description);
      if (result.code === 0) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.description} - EXCEPTION: ${error.message}`);
      failed++;
    }
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`
  );

  if (failed === 0) {
    console.log('\n🎉 All tests passed! JS->TS transition successful!');
    console.log('\n✨ Key achievements:');
    console.log('   - CLI still functional after removing JS files');
    console.log('   - TypeScript compilation working');
    console.log('   - Command system integrated with TS services');
    console.log('   - Service architecture maintained');
    console.log('   - Build process established');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }

  console.log('\n🔧 Next steps:');
  console.log('   - Continue TypeScript migration of remaining JS files');
  console.log('   - Add npm scripts for production build');
  console.log('   - Test with real AI API calls');
  console.log('   - Update package.json for TS distribution');
}

main().catch(console.error);
