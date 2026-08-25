const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<script src=" arabic-reshaper\.js\\><\/script>\s*<!-- Application Logic -->/g, '<script src="arabic-reshaper.js"></script>\n    <!-- Application Logic -->');
fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed tag');
