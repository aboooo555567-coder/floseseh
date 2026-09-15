const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg width="200" height="85" viewBox="0 0 250 100" style="position:absolute;top:15px;right:0px;opacity:0\.7;">.*?<\/svg>/s;

const exactSvg = `<svg width="150" height="80" viewBox="0 0 150 80" style="position:absolute;top:20px;right:0px;opacity:0.6;">
    <path d="M 0,10 L 40,40 L 90,10 L 130,30 L 150,0 M 40,40 L 60,70 L 90,10 M 60,70 L 130,30 M 90,10 L 110,80 L 130,30 M 110,80 L 150,60" stroke="#b0c4de" stroke-width="1.2" fill="none"/>
  </svg>`;

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, exactSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG mesh reverted to original Seha reference.");
} else {
    console.log("Could not find the SVG tag to replace.");
}
