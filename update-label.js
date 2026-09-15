const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// I'll use regex to match the exact label element before the select
const regex = /<label>[^<]+<\/label>\s*<select id="leave_type"/;
html = html.replace(regex, '<label>نوع التقرير</label>\n                        <select id="leave_type"');

fs.writeFileSync('index.html', html, 'utf8');
console.log("Replaced label securely.");
