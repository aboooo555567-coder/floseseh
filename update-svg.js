const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg width="180" height="120" viewBox="0 0 200 120" style="position:absolute;top:15px;right:0px;opacity:0\.5;">\s*<path d="(.*?)" stroke="#7ca9c9" stroke-width="1\.0" fill="none"\/>\s*<\/svg>/s;

const newSvg = `<svg width="250" height="150" viewBox="0 0 200 120" style="position:absolute;top:0px;right:0px;opacity:0.85;">
    <path d="$1" stroke="#5D99C6" stroke-width="1.2" fill="none"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, newSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated geometric graphic in header successfully.");
} else {
    console.log("Could not find the SVG element.");
}
