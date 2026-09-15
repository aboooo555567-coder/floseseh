const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    "[{ text: 'Open', web_app: { url: adminUrl } }],\r\n        [{ text: 'Open', web_app: { url: inquiryUrl } }]",
    "[{ text: '🚀 فتح لوحة التحكم', web_app: { url: adminUrl } }],\n        [{ text: '🔍 فتح الاستعلام الداخلي', web_app: { url: inquiryUrl } }]"
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Restored admin button texts.");
