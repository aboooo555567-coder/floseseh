const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const target1 = `            // QR Code
            document.getElementById('pdf-qrcode').innerHTML = \`<img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=https://example.com/demo-verify" style="width:110px;height:110px;">\`;`;

const target2 = `const verifyUrl = 'https://example.com/demo-verify';`;

appJs = appJs.replace(target1, '// Removed external API overwrite');
appJs = appJs.replace(target2, 'const verifyUrl = `${window.location.origin}/verify.html?${verifyParams.toString()}`;');

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed QR API overwrite and verifyUrl');
