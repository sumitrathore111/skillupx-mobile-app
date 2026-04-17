const fs = require('fs');
// Minimal valid 1x1 transparent PNG
const png = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
  '0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex'
);
fs.writeFileSync('assets/icon.png', png);
fs.writeFileSync('assets/splash.png', png);
fs.writeFileSync('assets/adaptive-icon.png', png);
fs.writeFileSync('assets/favicon.png', png);
console.log('All 4 placeholder assets created successfully.');
