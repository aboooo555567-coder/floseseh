const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace('tr:nth-child(even) td:not(.dur-label) { background-color: #f7f8f9; }', 'tr:nth-child(even) td { background-color: #f8f9fa; }');

fs.writeFileSync('server.js', serverJs, 'utf8');
