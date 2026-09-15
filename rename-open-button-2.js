const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace using regex to match ANY text before web_app: { url: WEB_APP_URL_CACHED }
// Example: [{ text: '🖥️ فتح لوحة التحكم (إصدار التقارير)', web_app: { url: WEB_APP_URL_CACHED } }]
serverJs = serverJs.replace(/text:\s*'[^']+',\s*web_app:/g, "text: '🚀 Open', web_app:");

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Updated WebApp button text to '🚀 Open'.");
