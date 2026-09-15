const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Increase footer height to make space for license and push NHIC down
serverJs = serverJs.replace(
    /margin-top:40px; height:200px;/g,
    'margin-top:40px; height:240px;'
);

// 2. Enlarge NHIC logo and shift it to the right edge
serverJs = serverJs.replace(
    /      <!-- NHIC Logo -->\n      <div>\n        <img src="\$\{nhicLogo\}" style="height:55px;">\n      <\/div>/g,
    '      <!-- NHIC Logo -->\n      <div style="text-align:right; margin-top:15px; margin-right:-20px;">\n        <img src="${nhicLogo}" style="height:75px;">\n      </div>'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed NHIC logo size and position');
