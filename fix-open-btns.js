const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// The one in configureChatMenuButton
serverJs = serverJs.replace(/text: '🚀 Open', web_app: { url: WEB_APP_URL_CACHED }\s*}/, "text: 'Open', web_app: { url: WEB_APP_URL_CACHED }\n                }");

// The others
serverJs = serverJs.replace(/'🚀 Open'/g, "'🚀 فتح'");

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Updated button text.");
