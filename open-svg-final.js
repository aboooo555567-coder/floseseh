const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg [^>]*style="position:absolute;top:20px;right:0px;[^>]*>.*?<\/svg>/s;

const exactSvg = `<svg width="270" height="110" viewBox="0 0 280 120" style="position:absolute;top:15px;right:0px;opacity:0.8;">
    <path d="M 20,50 L 70,10 L 80,70 Z M 70,10 L 140,20 L 80,70 Z M 80,70 L 140,20 L 150,60 Z M 80,70 L 150,60 L 130,110 Z M 140,20 L 200,0 L 150,60 Z M 150,60 L 200,0 L 210,50 Z M 150,60 L 210,50 L 170,110 Z M 200,0 L 250,10 L 210,50 Z M 210,50 L 250,10 L 250,80 Z M 210,50 L 250,80 L 170,110 Z M 250,10 L 280,45 L 250,80 Z" stroke="#8caec4" stroke-width="0.7" fill="none" stroke-linejoin="round"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh stretched and opened successfully.");
} else {
    console.log("Could not find the SVG tag to replace.");
}
