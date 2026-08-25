const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
if (!html.includes('arabic-reshaper.js')) {
    html = html.replace('<script src="app.js"></script>', '<script src="arabic-reshaper.js"></script>\n    <script src="app.js"></script>');
    fs.writeFileSync('index.html', html, 'utf8');
}
console.log('Added script to index.html');
