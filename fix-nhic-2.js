const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /<!-- NHIC Logo -->[\s\S]*?<img src="\$\{nhicLogo\}" style="height:55px;">[\s\S]*?<\/div>/g,
    '<!-- NHIC Logo -->\n      <div style="text-align:right; margin-top:15px; margin-right:-20px;">\n        <img src="${nhicLogo}" style="height:75px;">\n      </div>'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed NHIC logo successfully');
