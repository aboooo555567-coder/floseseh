const fs = require('fs');
const img = fs.readFileSync('الشعارات/ksa_calligraphy_new.jpg');
const base64 = 'data:image/jpeg;base64,' + img.toString('base64');
let html = fs.readFileSync('pdf-template.html', 'utf8');

const regex = /<h2 style="font-family: 'Amiri', 'Times New Roman', serif; font-size: 26px; color: #000; margin: 0 0 5px 0; font-weight: bold; letter-spacing: 0px;">.*?<\/h2>\s*<p style="font-family: 'Times New Roman', Times, serif; font-size: 16px; color: #000; margin: 0; font-weight: bold; letter-spacing: 0px;">Kingdom of Saudi Arabia<\/p>/;
const replacement = \<img src="\" alt="KSA Calligraphy" style="width: 250px; height: auto; object-fit: contain; margin-bottom: 5px;">\;

html = html.replace(regex, replacement);
fs.writeFileSync('pdf-template.html', html, 'utf8');
console.log('Replaced');
