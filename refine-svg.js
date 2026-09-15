const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const targetRegex = /<svg [^>]*style="position:absolute;top:20px;right:0px;[^>]*>.*?<\/svg>/s;

const exactSvg = `<svg width="230" height="90" viewBox="0 0 250 100" style="position:absolute;top:15px;right:0px;opacity:0.65;">
    <path d="M 10,45 L 35,15 L 45,65 Z M 35,15 L 75,5 L 85,40 Z M 35,15 L 85,40 L 45,65 Z M 45,65 L 85,40 L 105,80 Z M 75,5 L 125,0 L 85,40 Z M 85,40 L 125,0 L 145,45 Z M 85,40 L 145,45 L 105,80 Z M 105,80 L 145,45 L 165,85 Z M 125,0 L 185,5 L 145,45 Z M 145,45 L 185,5 L 195,55 Z M 145,45 L 195,55 L 165,85 Z M 185,5 L 235,15 L 195,55 Z M 195,55 L 235,15 L 250,85 Z" stroke="#7ca9c9" stroke-width="0.7" fill="none" stroke-linejoin="round"/>
  </svg>`;

if (targetRegex.test(serverJs)) {
    serverJs = serverJs.replace(targetRegex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh refined and formatted.");
} else {
    console.log("Could not find the SVG tag to replace.");
}
