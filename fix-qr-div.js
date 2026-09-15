const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Shrink QR Code from 105x105 to 90x90
serverJs = serverJs.replace('size=105x105', 'size=90x90');
serverJs = serverJs.replace('style="width:105px;height:105px;margin-bottom:12px;"', 'style="width:90px;height:90px;margin-bottom:12px;"');

// 2. Enlarge Divider and align it
serverJs = serverJs.replace('<div style="width:1px; background-color:#cccccc; height:130px; margin-top: 20px;"></div>', '<div style="width:1px; background-color:#cccccc; height:150px; margin-top: 5px;"></div>');

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Updated QR code size and divider height.");
