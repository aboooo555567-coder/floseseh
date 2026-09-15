const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg [^>]*style="position:absolute;top:15px;right:0px;[^>]*>.*?<\/svg>/s;

const exactSvg = `<svg width="270" height="100" viewBox="0 0 260 100" style="position:absolute;top:15px;right:0px;opacity:0.85;">
    <path d="M 0,50 L 30,20 L 40,75 Z M 30,20 L 70,0 L 80,45 Z M 30,20 L 80,45 L 40,75 Z M 40,75 L 80,45 L 90,90 Z M 70,0 L 130,10 L 80,45 Z M 80,45 L 130,10 L 140,55 Z M 80,45 L 140,55 L 90,90 Z M 90,90 L 140,55 L 150,95 Z M 130,10 L 190,25 L 140,55 Z M 140,55 L 190,25 L 200,70 Z M 140,55 L 200,70 L 150,95 Z M 150,95 L 200,70 L 250,90 Z M 190,25 L 240,35 L 200,70 Z M 200,70 L 240,35 L 250,90 Z M 240,35 L 250,90" stroke="#7ca9c9" stroke-width="0.75" fill="none" stroke-linejoin="round"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh shape completely aligned to reference topology.");
} else {
    console.log("Could not find the SVG tag to replace.");
}
