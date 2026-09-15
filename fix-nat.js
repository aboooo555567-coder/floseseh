const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// Add aliases to natMap to catch manual entry
appJs = appJs.replace(
    /"السعودية \/ سعودي":"Saudi Arabia"/g,
    '"السعودية / سعودي":"Saudi Arabia", "السعودية":"Saudi Arabia", "سعودي":"Saudi Arabian", "سعودية":"Saudi Arabian"'
);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Added aliases to natMap');
