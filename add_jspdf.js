const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
if(!html.includes('jspdf.umd.min.js')) {
    html = html.replace('</head>', '    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n</head>');
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Added jspdf script');
}
