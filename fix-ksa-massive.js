const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /<img src="\$\{ksaCalligraphy\}" style="position:absolute;top:40px;left:50%;transform:translateX\(-50%\);width:340px;height:145px;object-fit:contain;">/,
    '<img src="${ksaCalligraphy}" style="position:absolute;top:0px;left:50%;transform:translateX(-50%);width:550px;height:210px;object-fit:contain;">'
);

serverJs = serverJs.replace(
    /<!-- Data Table -->\s*<div style="position:absolute;top:205px;left:40px;width:714px;">/,
    '<!-- Data Table -->\n  <div style="position:absolute;top:230px;left:40px;width:714px;">'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Massively enlarged KSA calligraphy image and pushed table');
