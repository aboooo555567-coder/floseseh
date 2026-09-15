const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// Update label-en: remove underline, center align horizontally and vertically
serverJs = serverJs.replace(
    /\.label-en \{ border: 1px solid #dee2e6; padding: 10px 8px; font-weight: bold; color: #216ba5; font-size: 12px; width: 155px; text-decoration: underline; font-style: italic; text-align: left; \}/g,
    '.label-en { border: 1px solid #dee2e6; padding: 10px 8px; font-weight: bold; color: #216ba5; font-size: 12px; width: 155px; font-style: italic; text-align: center !important; vertical-align: middle !important; }'
);

// Update label-ar: center align horizontally and vertically
serverJs = serverJs.replace(
    /\.label-ar \{ border: 1px solid #dee2e6; padding: 10px 8px; font-weight: bold; color: #216ba5; font-size: 13px; width: 155px; text-align: right; \}/g,
    '.label-ar { border: 1px solid #dee2e6; padding: 10px 8px; font-weight: bold; color: #216ba5; font-size: 13px; width: 155px; text-align: center !important; vertical-align: middle !important; }'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed label centering and removed underline');
