const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Find the lines with hospital names and change font sizes
// Arabic: 13px -> 11px
const searchAr = `<h3 style="font-size:13px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr || ''}</h3>`;
const replaceAr = `<h3 style="font-size:11px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr || ''}</h3>`;

// English: 12px -> 10px
const searchEn = `<h4 style="font-size:12px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn || ''}</h4>`;
const replaceEn = `<h4 style="font-size:10px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn || ''}</h4>`;

if (serverJs.includes(searchAr)) {
    serverJs = serverJs.replace(searchAr, replaceAr);
    console.log("Reduced Arabic hospital name font size (13px -> 11px).");
} else {
    console.log("Could not find Arabic string.");
}

if (serverJs.includes(searchEn)) {
    serverJs = serverJs.replace(searchEn, replaceEn);
    console.log("Reduced English hospital name font size (12px -> 10px).");
} else {
    console.log("Could not find English string.");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
