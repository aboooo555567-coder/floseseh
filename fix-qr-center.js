const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// Center the QR code
serverJs = serverJs.replace(
    /<div style="text-align:left;margin-bottom:8px;">\n          <img src="https:\/\/api\.qrserver\.com/g,
    '<div style="text-align:center;margin-bottom:8px;">\n          <img src="https://api.qrserver.com'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Centered QR code');
