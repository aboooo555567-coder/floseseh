const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Find the hospital Arabic name h3 tag and add text-align:center and word-wrap
const searchStr = `<h3 style="font-size:13px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;">\${d.hospitalAr || ''}</h3>`;
const replaceStr = `<h3 style="font-size:13px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr || ''}</h3>`;

// Find the hospital English name h4 tag and add text-align:center and word-wrap
const searchStr2 = `<h4 style="font-size:12px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;">\${d.hospitalEn || ''}</h4>`;
const replaceStr2 = `<h4 style="font-size:12px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:300px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn || ''}</h4>`;

if (serverJs.includes(searchStr)) {
    serverJs = serverJs.replace(searchStr, replaceStr);
    console.log("Updated Arabic hospital name styling.");
} else {
    console.log("Could not find Arabic hospital name string.");
}

if (serverJs.includes(searchStr2)) {
    serverJs = serverJs.replace(searchStr2, replaceStr2);
    console.log("Updated English hospital name styling.");
} else {
    console.log("Could not find English hospital name string.");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Done!");
