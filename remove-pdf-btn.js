const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// I will use regex to find and remove the reply_markup block in sendDocument options
const regex = /,\s*reply_markup:\s*\{\s*inline_keyboard:\s*\[\[\s*\{\s*text:\s*'Open',\s*web_app:\s*\{\s*url:\s*WEB_APP_URL_CACHED\s*\}\s*\}\s*\]\]\s*\}\s*/g;

serverJs = serverJs.replace(regex, '');

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Removed Open button from sendDocument calls.");
