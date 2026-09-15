const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /\.val \{ border: 1px solid #dee2e6; padding: 10px 8px; color: #333;/g,
    '.val { border: 1px solid #dee2e6; padding: 10px 8px; color: #000080; font-weight: bold;'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Changed user data color to Navy');
