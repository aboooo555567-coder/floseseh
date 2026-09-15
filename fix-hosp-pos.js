const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// We will add margin-left:15px; to the h3 and h4 tags.
const searchAr = `font-family:'Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;`;
const replaceAr = `font-family:'Tajawal',sans-serif;margin:0 0 4px 15px;color:#000;text-align:center;`;

const searchEn = `font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#000;text-align:center;`;
const replaceEn = `font-family:'Arial',sans-serif;margin:0 0 3px 15px;color:#000;text-align:center;`;

if (serverJs.includes(searchAr)) {
    serverJs = serverJs.replace(searchAr, replaceAr);
    console.log("Added left margin to shift Arabic hospital name right.");
} else {
    console.log("Could not find Arabic string.");
}

if (serverJs.includes(searchEn)) {
    serverJs = serverJs.replace(searchEn, replaceEn);
    console.log("Added left margin to shift English hospital name right.");
} else {
    console.log("Could not find English string.");
}

fs.writeFileSync('server.js', serverJs, 'utf8');
