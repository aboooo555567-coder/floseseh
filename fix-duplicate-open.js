const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    "[{ text: 'Open', web_app: { url: WEB_APP_URL_CACHED } }],\r\n                [{ text: 'Open', web_app: { url: WEB_APP_URL_CACHED } }],",
    "[{ text: 'Open', web_app: { url: WEB_APP_URL_CACHED } }],"
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Removed duplicate Open button.");
