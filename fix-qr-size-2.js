const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Reduce QR code from 75x75 to 60x60
serverJs = serverJs.replace(
    'size=75x75',
    'size=60x60'
);
serverJs = serverJs.replace(
    'width:75px;height:75px;',
    'width:60px;height:60px;'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("QR code size reduced from 75x75 to 60x60.");
