const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /<div style="text-align:center;margin-bottom:8px;">\s*<img src="https:\/\/api\.qrserver\.com\/v1\/create-qr-code/g,
    '<div style="text-align:center;margin-top:20px;margin-bottom:8px;">\n          <img src="https://api.qrserver.com/v1/create-qr-code'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Added margin-top to QR code div');
