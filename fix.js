const fs = require('fs');
const base64 = fs.readFileSync('ksa64.txt', 'utf8');
let html = fs.readFileSync('pdf-template.html', 'utf8');
const regex = /<h2 style=.font-family: 'Amiri'[^>]*>.*?<\/h2>\s*<p style=.font-family: 'Times New Roman'[^>]*>Kingdom of Saudi Arabia<\/p>/;
html = html.replace(regex, '<img src="' + base64 + '" alt="KSA Calligraphy" style="width: 250px; height: auto; object-fit: contain; margin-bottom: 5px;">');
fs.writeFileSync('pdf-template.html', html, 'utf8');
console.log('Done');
