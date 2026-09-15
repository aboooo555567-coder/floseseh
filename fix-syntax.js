const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split(/\r?\n/);
lines.splice(791, 3);
fs.writeFileSync('server.js', lines.join('\n'), 'utf8');
console.log('Fixed syntax');
