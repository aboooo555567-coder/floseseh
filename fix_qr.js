const fs = require('fs');

let html = fs.readFileSync('pdf-template.html', 'utf8');
html = html.replace('www.seha.sa/#/inquiries/slenquiry', 'https://example.com/demo');
html = html.replace("To check the report please visit Seha's offical website", 'This is a DEMO / SAMPLE generated for testing');
html = html.replace('للتحقق من صحة التقرير يرجى زيارة موقع منصة صحة الرسمي', 'للتحقق (هذه نسخة تجريبية)');

fs.writeFileSync('pdf-template.html', html, 'utf8');
console.log('Fixed text in pdf-template.html');

let appJs = fs.readFileSync('app.js', 'utf8');

// Replace the verification URL
const targetUrl = 'const verifyUrl = `${window.location.origin}/verify.html?${verifyParams.toString()}`;';
const replaceUrl = "const verifyUrl = 'https://example.com/demo-verify';";
appJs = appJs.replace(targetUrl, replaceUrl);

// Replace the image URL
appJs = appJs.replace(
    /https:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?size=110x110&data=\$\{encodeURIComponent\(reportDataPayload\.leaveId\)\}/g,
    'https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=https://example.com/demo-verify'
);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed QR in app.js');
