const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Fix .val to be dark gray (#555555) and normal weight
const oldVal = ".val { border: 1px solid #dee2e6; padding: 10px 8px; color: #1A365D; font-weight: bold; font-size: 12px; text-align: center !important; vertical-align: middle !important; }";
const newVal = ".val { border: 1px solid #dee2e6; padding: 10px 8px; color: #555555; font-weight: normal; font-size: 13px; text-align: center !important; vertical-align: middle !important; }";

// 2. Fix .label-en to remove italic and ensure it's bold and blue
const oldLabelEn = ".label-en { border: 1px solid #dee2e6; padding: 10px 8px; font-weight: bold; color: #216ba5; font-size: 12px; width: 155px; font-style: italic; text-align: center !important; vertical-align: middle !important; }";
const newLabelEn = ".label-en { border: 1px solid #dee2e6; padding: 10px 8px; font-weight: bold; color: #216ba5; font-size: 12px; width: 155px; text-align: center !important; vertical-align: middle !important; }";

if (serverJs.includes(oldVal) && serverJs.includes(oldLabelEn)) {
    serverJs = serverJs.replace(oldVal, newVal);
    serverJs = serverJs.replace(oldLabelEn, newLabelEn);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("PDF Table CSS updated successfully.");
} else {
    console.log("Could not find the exact strings to replace.");
    if (!serverJs.includes(oldVal)) console.log("Missing oldVal");
    if (!serverJs.includes(oldLabelEn)) console.log("Missing oldLabelEn");
}
