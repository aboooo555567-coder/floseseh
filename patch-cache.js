const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(/const WEB_APP_URL_CACHED = WEB_APP_URL \+ '\?v=\d+';/, "const WEB_APP_URL_CACHED = WEB_APP_URL + '?v=49';");

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Bumped cache buster to v=49");
