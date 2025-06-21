const { highlight, listLanguages, supportsLanguage } = require('cli-highlight');
const chalk = require('chalk');

/**
 * Simple test of cli-highlight without our service wrapper
 */
function testDirectHighlighting() {
  console.log('🔍 Testing cli-highlight directly\n');

  // Test 1: Basic JavaScript highlighting
  console.log('1. Testing JavaScript with default settings:');
  const jsCode = `function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return "greeting completed";
}`;

  try {
    const highlighted = highlight(jsCode, { language: 'javascript' });
    console.log(highlighted);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n2. Testing with ignoreIllegals:');
  try {
    const highlighted = highlight(jsCode, {
      language: 'javascript',
      ignoreIllegals: true,
    });
    console.log(highlighted);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n3. Testing without language specified:');
  try {
    const highlighted = highlight(jsCode);
    console.log(highlighted);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n4. Supported languages count:', listLanguages().length);
  console.log('JavaScript supported:', supportsLanguage('javascript'));
  console.log('TypeScript supported:', supportsLanguage('typescript'));
}

testDirectHighlighting();
