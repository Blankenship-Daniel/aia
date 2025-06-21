const { performance } = require('perf_hooks');
const fs = require('fs');

function measureFileOperations() {
  const start = performance.now();
  const files = fs.readdirSync('.');
  const end = performance.now();
  console.log(`File operation took ${end - start}ms`);
}

measureFileOperations();
