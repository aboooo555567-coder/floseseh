const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Revert .val to the Navy Blue bold text
const badVal = ".val { border: 1px solid #dee2e6; padding: 10px 8px; color: #555555; font-weight: normal; font-size: 13px; text-align: center !important; vertical-align: middle !important; }";
const goodVal = ".val { border: 1px solid #dee2e6; padding: 10px 8px; color: #1A365D; font-weight: bold; font-size: 12px; text-align: center !important; vertical-align: middle !important; }";

serverJs = serverJs.replace(badVal, goodVal);

// 2. Add the zebra striping CSS rule
// We'll insert it right before </style>
const endStyle = "</style>";
const stripingCss = "  tr:nth-child(even) td:not(.dur-label) { background-color: #f7f8f9; }\n";
if (!serverJs.includes(stripingCss)) {
    serverJs = serverJs.replace(endStyle, stripingCss + endStyle);
}

// Ensure .dur-row td always has the navy background (using !important just in case)
const oldDurRow = ".dur-row td { background-color: #1F3864; color: white;";
const newDurRow = ".dur-row td { background-color: #1F3864 !important; color: white;";
serverJs = serverJs.replace(oldDurRow, newDurRow);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Reverted font color and added zebra striping.");
