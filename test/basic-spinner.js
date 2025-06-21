const spinner = require('../src/spinner');
spinner.start('Testing spinner');
setTimeout(() => {
  spinner.stop();
  console.log('Test complete');
}, 1000);
