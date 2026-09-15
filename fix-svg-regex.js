const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<!-- Header: Geometric graphic \(right\) -->[\s\S]*?<\/svg>/;

const newSvg = `<!-- Header: Geometric graphic (right) -->
  <svg width="180" height="120" viewBox="0 0 200 120" style="position:absolute;top:15px;right:0px;opacity:0.5;">
    <path d="M 20,40 L 50,70 L 90,20 L 140,50 L 190,10 M 50,70 L 80,100 L 120,60 L 170,110 L 190,10 M 90,20 L 120,60 L 140,50 M 20,40 L 40,10 L 90,20 M 120,60 L 150,20 L 190,10 M 80,100 L 90,20" stroke="#7ca9c9" stroke-width="1.0" fill="none"/>
  </svg>`;

serverJs = serverJs.replace(regex, newSvg);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Updated geometric graphic SVG with regex');
