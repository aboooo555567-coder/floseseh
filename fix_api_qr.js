const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

appJs = appJs.replace(
    /document\.getElementById\('pdf-qrcode'\)\.innerHTML = `<img src="https:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?size=110x110&data=https:\/\/example\.com\/demo-verify" style="width:110px;height:110px;">`;/g,
    '// Removed external API overwrite'
);

// We must also ensure QRCode finishes rendering, but qrcode.js is synchronous
// Also I want to revert the fallback so dom-to-image is used. Wait, the revert was already done!
fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed QR overwrite in app.js');
