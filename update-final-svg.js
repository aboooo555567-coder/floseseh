const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg width="200" height="100" viewBox="0 0 250 120" style="position:absolute;top:15px;right:0px;opacity:0\.75;">.*?<\/svg>/s;

const exactSvg = `<svg width="200" height="85" viewBox="0 0 250 100" style="position:absolute;top:15px;right:0px;opacity:0.7;">
    <path d="M 20,20 L 60,0 L 80,50 L 20,20 M 60,0 L 130,0 L 80,50 M 130,0 L 130,60 L 80,50 M 130,60 L 160,90 L 130,0 M 130,0 L 190,20 L 130,60 M 190,20 L 160,90 M 190,20 L 230,0 L 200,40 L 190,20 M 230,0 L 230,70 L 200,40 M 230,70 L 160,90" stroke="#216ba5" stroke-width="0.75" fill="none"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh updated to final geometric structure.");
} else {
    console.log("Could not find the SVG tag to replace.");
}
