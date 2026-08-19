const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
if(!html.includes('html-to-image.js')) {
    html = html.replace('</head>', '    <script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.js"></script>\n</head>');
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Added html-to-image script');
}
