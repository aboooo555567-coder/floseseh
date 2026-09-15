const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /\.val \{ border: 1px solid #dee2e6; padding: 10px 8px; color: #333; font-size: 12px; \}/g,
    '.val { border: 1px solid #dee2e6; padding: 10px 8px; color: #333; font-size: 12px; text-align: center !important; vertical-align: middle !important; }'
);

serverJs = serverJs.replace(
    /\.dur-row td \{ background-color: #2b4b7c; color: white; border: 1px solid #4a6a9a; padding: 10px 8px; font-size: 12px; \}/g,
    '.dur-row td { background-color: #2b4b7c; color: white; border: 1px solid #4a6a9a; padding: 10px 8px; font-size: 12px; text-align: center !important; vertical-align: middle !important; }'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed CSS centering');
