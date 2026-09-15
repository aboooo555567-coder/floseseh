const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
s = s.replace(/const WEB_APP_URL = process\.env\.APP_URL \|\| 'https:\/\/seha-sickleave-app\.onrender\.com';/, "const WEB_APP_URL = process.env.APP_URL || 'https://seha-sickleave.onrender.com';");
s = s.replace(/\?v=\d+/g, '?v=43');
fs.writeFileSync('server.js', s, 'utf8');
console.log('Fixed server.js domain and v=43');
