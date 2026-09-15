const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg width="180" height="90" viewBox="0 0 250 110" style="position:absolute;top:20px;right:0px;opacity:0\.65;">.*?<\/svg>/s;

const exactSvg = `<svg width="200" height="100" viewBox="0 0 250 120" style="position:absolute;top:15px;right:0px;opacity:0.75;">
    <path d="M 230,0 L 200,40 L 230,90 M 200,0 L 200,100 M 200,40 L 160,60 L 200,100 M 200,0 L 130,10 L 160,60 M 160,60 L 110,80 L 130,10 M 130,10 L 70,50 L 110,80 M 70,50 L 50,0 L 130,10 M 110,80 L 90,100 L 70,50 M 50,0 L 20,40 L 70,50" stroke="#216ba5" stroke-width="0.8" fill="none"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh updated to match geometric reference precisely.");
} else {
    // try to find the previous one just in case
    const fallbackRegex = /<svg width="180" height="85" viewBox="0 0 250 120"[^>]*>.*?<\/svg>/s;
    if (fallbackRegex.test(serverJs)) {
        serverJs = serverJs.replace(fallbackRegex, exactSvg);
        fs.writeFileSync('server.js', serverJs, 'utf8');
        console.log("SVG mesh updated to match geometric reference precisely (fallback).");
    } else {
        console.log("Could not find the SVG tag to replace.");
    }
}
