const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const oldValCss = '.val { border: 1px solid #dee2e6; padding: 10px 8px; color: #3A2854;';
const newValCss = '.val { border: 1px solid #dee2e6; padding: 10px 8px; color: #216ba5;';

serverJs = serverJs.replace(oldValCss, newValCss);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Modified font color for user data in PDF');
