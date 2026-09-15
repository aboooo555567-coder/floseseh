const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace all web_app buttons that might have Arabic text or '🚀 فتح' with 'Open'
// The structure is { text: '...', web_app: { url: ... } }

const regex = /\{\s*text:\s*'[^']+',\s*web_app:\s*\{\s*url:/g;
serverJs = serverJs.replace(regex, "{ text: 'Open', web_app: { url:");

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Replaced all WebApp button texts to 'Open'");
