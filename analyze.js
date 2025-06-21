const { ESLint } = require('eslint');
const fs = require('fs').promises;
const path = require('path');

async function analyzeCode() {
  const eslint = new ESLint();
  try {
    const files = await fs.readdir('.');
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const results = await eslint.lintFiles(jsFiles);
    results.forEach(result => {
      console.log('\nFile:', result.filePath);
      result.messages.forEach(msg => {
        console.log();
      });
    });
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeCode();
