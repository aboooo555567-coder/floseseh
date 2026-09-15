const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const oldSvg = `<svg width="120" height="65" viewBox="0 0 150 80" style="position:absolute;top:35px;left:634px;opacity:0.6;">
    <path d="M 0,10 L 40,40 L 90,10 L 130,30 L 150,0 M 40,40 L 60,70 L 90,10 M 60,70 L 130,30 M 90,10 L 110,80 L 130,30 M 110,80 L 150,60" stroke="#b0c4de" stroke-width="1.2" fill="none"/>
  </svg>`;

const newSvg = `<svg width="180" height="120" viewBox="0 0 200 120" style="position:absolute;top:15px;right:0px;opacity:0.5;">
    <path d="M 20,40 L 50,70 L 90,20 L 140,50 L 190,10 
             M 50,70 L 80,100 L 120,60 L 170,110 L 190,10 
             M 90,20 L 120,60 L 140,50 
             M 20,40 L 40,10 L 90,20 
             M 120,60 L 150,20 L 190,10
             M 80,100 L 90,20" 
          stroke="#7ca9c9" stroke-width="1.0" fill="none"/>
  </svg>`;

serverJs = serverJs.split(oldSvg).join(newSvg);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Updated geometric graphic SVG');
