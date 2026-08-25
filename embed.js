const fs = require('fs');
const reg = fs.readFileSync('tajawal-reg.txt', 'utf8');
const bold = fs.readFileSync('tajawal-bold.txt', 'utf8');

const css = \
@font-face {
    font-family: 'Tajawal';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url(data:font/woff2;base64,\) format('woff2');
}
@font-face {
    font-family: 'Tajawal';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url(data:font/woff2;base64,\) format('woff2');
}
\;

// Inject into pdf-template.html
let html = fs.readFileSync('pdf-template.html', 'utf8');
html = html.replace('<!-- Inline Fonts to avoid CORS taint in canvas -->', '<style>' + css + '</style>');
// force dir="rtl" on Arabic cells
html = html.replace(/<td(.*?)class="label-ar"/g, '<td dir="rtl"="label-ar"');
html = html.replace(/<td(.*?)id="pdf-([a-zA-Z0-9_-]*)-ar"/g, '<td dir="rtl"="pdf--ar"');
html = html.replace(/<td(.*?)id="pdf-([a-zA-Z0-9_-]*)-h"/g, '<td dir="rtl"="pdf--h"');

fs.writeFileSync('pdf-template.html', html, 'utf8');

// Inject into index.html
let index = fs.readFileSync('index.html', 'utf8');
index = index.replace('</head>', '<style>' + css + '</style></head>');
fs.writeFileSync('index.html', index, 'utf8');
console.log('Fonts embedded');
