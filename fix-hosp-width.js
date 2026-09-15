const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// We will replace max-width:300px with max-width:200px to force early line breaks on long names.
const searchAr = `text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr`;
const replaceAr = `text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr`;

const searchEn = `text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn`;
const replaceEn = `text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn`;

if (serverJs.includes(searchAr)) {
    serverJs = serverJs.replace(searchAr, replaceAr);
    console.log("Updated Arabic hospital max-width to 210px.");
}

if (serverJs.includes(searchEn)) {
    serverJs = serverJs.replace(searchEn, replaceEn);
    console.log("Updated English hospital max-width to 210px.");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
