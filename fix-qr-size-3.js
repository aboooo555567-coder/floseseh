const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Increase QR code size from 60x60 to 68x68
serverJs = serverJs.replace(
    'size=60x60',
    'size=68x68'
);
serverJs = serverJs.replace(
    'width:60px;height:60px;',
    'width:68px;height:68px;'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("QR code size increased from 60x60 to 68x68.");
