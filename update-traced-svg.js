const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg[^>]*>.*?<\/svg>/s;
// We need to replace the specific header SVG, not any other SVG.
// The header SVG is the one with opacity:0.6 or opacity:0.75 near top:20px.
// Let's use a targeted replace.

const targetRegex = /<svg width="\d+" height="\d+" viewBox="0 0 250 \d+" style="position:absolute;top:\d+px;right:0px;opacity:[\d\.]+;">\s*<path d=".*?" stroke=".*?" stroke-width=".*?" fill="none"\/>\s*<\/svg>/s;
const fallbackRegex = /<svg width="150" height="80" viewBox="0 0 150 80".*?<\/svg>/s;

const exactSvg = `<svg width="220" height="85" viewBox="0 0 250 100" style="position:absolute;top:20px;right:0px;opacity:0.65;">
    <path d="M 20,40 L 50,20 L 60,70 Z M 50,20 L 70,0 L 90,40 Z M 50,20 L 90,40 L 60,70 Z M 60,70 L 90,40 L 110,80 Z M 70,0 L 130,0 L 90,40 Z M 90,40 L 130,0 L 150,50 Z M 90,40 L 150,50 L 110,80 Z M 110,80 L 150,50 L 170,90 Z M 130,0 L 190,0 L 150,50 Z M 150,50 L 190,0 L 200,60 Z M 150,50 L 200,60 L 170,90 Z M 190,0 L 240,20 L 200,60 Z M 200,60 L 240,20 L 250,80 Z" stroke="#337ab7" stroke-width="1.0" fill="none"/>
  </svg>`;

if (targetRegex.test(serverJs)) {
    serverJs = serverJs.replace(targetRegex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh updated to the perfectly traced visual polygon mesh.");
} else if (fallbackRegex.test(serverJs)) {
    serverJs = serverJs.replace(fallbackRegex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh updated to the perfectly traced visual polygon mesh (fallback).");
} else {
    // Just replace the first SVG that matches style="position:absolute;top:20px;right:0px;
    const generalRegex = /<svg [^>]*style="position:absolute;top:20px;right:0px;[^>]*>.*?<\/svg>/s;
    if (generalRegex.test(serverJs)) {
        serverJs = serverJs.replace(generalRegex, exactSvg);
        fs.writeFileSync('server.js', serverJs, 'utf8');
        console.log("SVG mesh updated to the perfectly traced visual polygon mesh (general).");
    } else {
        console.log("Could not find the SVG tag to replace.");
    }
}
