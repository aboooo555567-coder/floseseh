const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Fix the Arabic text margin (remove the 15px left margin)
const searchAr = `margin:0 0 4px 15px;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr`;
const replaceAr = `margin:0 0 4px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalAr`;

// 2. Fix the English text margin (remove the 15px left margin)
const searchEn = `margin:0 0 3px 15px;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn`;
const replaceEn = `margin:0 0 3px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">\${d.hospitalEn`;

// 3. Shift the ENTIRE container to the right to compensate (change padding-left from 15px to 25px)
const searchContainer = `<!-- Right: MOH Logo + Hospital Name -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:15px; padding-top: 0px;">`;
const replaceContainer = `<!-- Right: MOH Logo + Hospital Name -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:25px; padding-top: 0px;">`;

if (serverJs.includes(searchAr)) {
    serverJs = serverJs.replace(searchAr, replaceAr);
    console.log("Fixed Arabic text centering.");
}
if (serverJs.includes(searchEn)) {
    serverJs = serverJs.replace(searchEn, replaceEn);
    console.log("Fixed English text centering.");
}
if (serverJs.includes(searchContainer)) {
    serverJs = serverJs.replace(searchContainer, replaceContainer);
    console.log("Shifted whole container to the right.");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
