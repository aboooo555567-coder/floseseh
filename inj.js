const fs = require('fs');
const reg = fs.readFileSync('tajawal-reg.txt', 'utf8');
const bold = fs.readFileSync('tajawal-bold.txt', 'utf8');

const fontCss = `
@font-face { font-family: 'Tajawal'; font-style: normal; font-weight: 400; font-display: swap; src: url(data:font/ttf;base64,${reg}) format('truetype'); }
@font-face { font-family: 'Tajawal'; font-style: normal; font-weight: 700; font-display: swap; src: url(data:font/ttf;base64,${bold}) format('truetype'); }
`;

let html = fs.readFileSync('pdf-template.html', 'utf8');
// Wipe the old style tag block entirely
html = html.replace(/<style>[\s\S]*?<\/style>/g, '<style>\n' + fontCss + '\n*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; } html { background: #fff !important; } body { margin: 0; padding: 0; background: #fff !important; width: 794px; height: 1123px; overflow: hidden; } @page { size: 794px 1123px; margin: 0; } table { border-spacing: 0; } td { font-family: \'Tajawal\', \'Arial\', sans-serif; } .label-en { border: 1.5px solid #b8c8dc; padding: 8px 10px; font-weight: bold; color: #216ba5; font-size: 13px; width: 140px; text-decoration: underline; font-style: italic; text-align: left; } .label-ar { border: 1.5px solid #b8c8dc; padding: 8px 10px; font-weight: bold; color: #216ba5; font-size: 14px; width: 140px; text-align: right; } .val { border: 1.5px solid #b8c8dc; padding: 8px 10px; color: #333; font-size: 14px; } .dur-row td { background-color: #2b4b7c; color: white; border: 1.5px solid #2b4b7c; padding: 8px 10px; font-size: 13px; } .dur-label { font-weight: bold; } \n</style>');

fs.writeFileSync('pdf-template.html', html, 'utf8');

let index = fs.readFileSync('index.html', 'utf8');
index = index.replace(/<style>[\s\S]*?<\/style><\/head>/, '<style>\n' + fontCss + '\n</style></head>');
fs.writeFileSync('index.html', index, 'utf8');
console.log('done fixing fonts');
