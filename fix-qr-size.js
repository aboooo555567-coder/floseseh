const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Reduce QR code from 90x90 to 75x75
serverJs = serverJs.replace(
    'size=90x90',
    'size=75x75'
);
serverJs = serverJs.replace(
    'width:90px;height:90px;',
    'width:75px;height:75px;'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("QR code size reduced from 90x90 to 75x75.");
