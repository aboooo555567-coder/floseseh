const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Reduce Arabic font from 11.5px to 10.5px
const searchAr = `font-size:11.5px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr`;
const replaceAr = `font-size:10.5px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr`;

// Reduce English font from 10.5px to 9.5px
const searchEn = `font-size:10.5px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn`;
const replaceEn = `font-size:9.5px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn`;

if (serverJs.includes(searchAr)) {
    serverJs = serverJs.replace(searchAr, replaceAr);
    console.log("Reduced Arabic hospital font size to 10.5px.");
} else {
    console.log("Could not find Arabic string.");
}

if (serverJs.includes(searchEn)) {
    serverJs = serverJs.replace(searchEn, replaceEn);
    console.log("Reduced English hospital font size to 9.5px.");
} else {
    console.log("Could not find English string.");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
