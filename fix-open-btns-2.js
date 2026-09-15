const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// I will just change text: '🚀 فتح' back to text: 'Open' ONLY inside configureChatMenuButton
let funcStart = serverJs.indexOf('const configureChatMenuButton');
if (funcStart !== -1) {
    let before = serverJs.substring(0, funcStart);
    let after = serverJs.substring(funcStart);
    after = after.replace(/'🚀 فتح'/g, "'Open'"); // Menu button text should be English 'Open' or Arabic 'فتح'
    serverJs = before + after;
}

// And let's fix line 272 which is messed up!
// it says:
// [{ text: 'Open', web_app: { url: WEB_APP_URL_CACHED }
// }]
serverJs = serverJs.replace(/\[\{ text: 'Open', web_app: \{ url: WEB_APP_URL_CACHED \}\s*\}\],/g, "[{ text: '🚀 فتح', web_app: { url: WEB_APP_URL_CACHED } }],");

fs.writeFileSync('server.js', serverJs, 'utf8');
