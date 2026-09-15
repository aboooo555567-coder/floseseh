const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// regex to remove the admin-fab-item div
html = html.replace(/<div class="fab-menu-item"[^>]*id="admin-fab-item"[^>]*>[\s\S]*?<\/div>/, '');

// Cache bust app.js
html = html.replace(/app\.js\?v=\d+/g, 'app.js?v=' + Math.floor(Math.random() * 1000));

fs.writeFileSync('index.html', html, 'utf8');
console.log('Modified index.html');
