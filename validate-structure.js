const fs = require('fs');
const path = require('path');

const required = ['src', 'src/spinner.js', 'test'];
const missing = required.filter(p => !fs.existsSync(path.join(process.cwd(), p)));
console.log(JSON.stringify({missing, exists: missing.length === 0}));
