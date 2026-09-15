const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg width="180" height="85" viewBox="0 0 250 120" style="position:absolute;top:25px;right:0px;opacity:0\.7;">\s*<path d="(.*?)" stroke="#216ba5" stroke-width="0\.7" fill="none"\/>\s*<\/svg>/s;

const exactSvg = `<svg width="180" height="90" viewBox="0 0 250 110" style="position:absolute;top:20px;right:0px;opacity:0.65;">
    <path d="M 10,40 L 50,10 L 80,60 L 120,20 L 150,70 L 190,10 L 220,50 L 240,10 L 240,70 L 220,50 M 10,40 L 80,60 L 120,90 L 150,70 L 190,100 L 220,50 M 50,10 L 120,20 L 190,10 L 240,10 M 80,60 L 150,70 L 220,50 M 120,90 L 190,100 L 240,70 M 240,70 L 250,100 L 220,50 M 250,100 L 190,100" stroke="#216ba5" stroke-width="0.75" fill="none"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh replaced with exact matching structure.");
} else {
    console.log("Could not find the SVG tag to replace.");
}
