const fs = require('fs');
let html = fs.readFileSync('pdf-template.html', 'utf8');
// Use a regex that catches any sequence of replacement characters or mojibake inside the h2
html = html.replace(/<h2[^>]*>.*?<\/h2>/, '<h2 style="font-family: \'Amiri\', \'Times New Roman\', serif; font-size: 26px; color: #000; margin: 0 0 5px 0; font-weight: bold; letter-spacing: 0px;">الْمَمْلَكَةُ الْعَرَبِيَّةُ السُّعُودِيَّةُ</h2>');
fs.writeFileSync('pdf-template.html', html, 'utf8');
console.log('Fixed header');
