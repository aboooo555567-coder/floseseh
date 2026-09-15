const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Change Arabic font from 11px to 12px
const searchAr = `font-size:11px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr`;
const replaceAr = `font-size:12px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr`;

// Change English font from 10px to 11px
const searchEn = `font-size:10px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn`;
const replaceEn = `font-size:11px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn`;

if (serverJs.includes(searchAr)) {
    serverJs = serverJs.replace(searchAr, replaceAr);
    console.log("Increased Arabic hospital font size to 12px.");
} else {
    console.log("Could not find Arabic string.");
}

if (serverJs.includes(searchEn)) {
    serverJs = serverJs.replace(searchEn, replaceEn);
    console.log("Increased English hospital font size to 11px.");
} else {
    console.log("Could not find English string.");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
