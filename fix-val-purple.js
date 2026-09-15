const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /\.val \{ border: 1px solid #dee2e6; padding: 10px 8px; color: #000080; font-weight: bold;/g,
    '.val { border: 1px solid #dee2e6; padding: 10px 8px; color: #3A2854; font-weight: bold;'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Changed user data color to Dark Purplish');
