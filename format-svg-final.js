const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg [^>]*style="position:absolute;top:15px;right:0px;[^>]*>.*?<\/svg>/s;
const regex2 = /<svg [^>]*style="position:absolute;top:20px;right:0px;[^>]*>.*?<\/svg>/s;

const exactSvg = `<svg width="240" height="95" viewBox="0 0 260 100" style="position:absolute;top:20px;right:0px;opacity:0.8;">
    <path d="M 10,40 L 35,20 L 45,60 Z M 35,20 L 70,10 L 80,45 Z M 35,20 L 80,45 L 45,60 Z M 45,60 L 80,45 L 90,75 Z M 70,10 L 115,5 L 120,40 Z M 70,10 L 120,40 L 80,45 Z M 80,45 L 120,40 L 130,65 Z M 80,45 L 130,65 L 90,75 Z M 90,75 L 130,65 L 140,90 Z M 115,5 L 165,0 L 160,35 Z M 115,5 L 160,35 L 120,40 Z M 120,40 L 160,35 L 170,60 Z M 120,40 L 170,60 L 130,65 Z M 130,65 L 170,60 L 180,85 Z M 130,65 L 180,85 L 140,90 Z M 165,0 L 210,10 L 200,45 Z M 165,0 L 200,45 L 160,35 Z M 160,35 L 200,45 L 215,70 Z M 160,35 L 215,70 L 170,60 Z M 170,60 L 215,70 L 225,95 Z M 170,60 L 225,95 L 180,85 Z M 210,10 L 250,25 L 235,55 Z M 210,10 L 235,55 L 200,45 Z M 200,45 L 235,55 L 245,85 Z M 200,45 L 245,85 L 215,70 Z M 215,70 L 245,85 L 225,95 Z M 235,55 L 260,35 L 245,85 Z" stroke="#8caec4" stroke-width="0.6" fill="none" stroke-linejoin="round"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh format completed.");
} else if (regex2.test(serverJs)) {
    serverJs = serverJs.replace(regex2, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh format completed (regex2).");
} else {
    console.log("Could not find the SVG tag to replace.");
}
