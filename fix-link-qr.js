const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace QR code data to be a URL instead of just the ID
serverJs = serverJs.replace(
    /data=\$\{encodeURIComponent\(d\.leaveId \|\| 'SEHA'\)\}/g,
    'data=${encodeURIComponent("https://www.seha.sa/#/inquiries/slenquiry")}'
);

// Replace the text link with an actual <a> tag
const oldP = `<p style="font-size:9px;color:#1a73e8;text-align:center;margin:0 0 15px 0;text-decoration:underline;">www.seha.sa/#/inquiries/slenquiry</p>`;
const newP = `<p style="font-size:9px;text-align:center;margin:0 0 15px 0;"><a href="https://www.seha.sa/#/inquiries/slenquiry" style="color:#1a73e8;text-decoration:underline;">www.seha.sa/#/inquiries/slenquiry</a></p>`;

serverJs = serverJs.replace(oldP, newP);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Updated QR code and link to be clickable URLs');
