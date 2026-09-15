const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace(/app\.js\?v=\d+/g, 'app.js?v=' + Math.floor(Math.random() * 1000));
fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('Cache busted app.js');
