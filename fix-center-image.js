const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /<!-- Header: KSA Calligraphy \(center\) -->\n  <img src="\$\{ksaCalligraphy\}" style="position:absolute;top:20px;left:50%;transform:translateX\(-50%\);width:140px;height:55px;object-fit:contain;">/,
    '<!-- Header: KSA Calligraphy (center) -->\n  <img src="${ksaCalligraphy}" style="position:absolute;top:50px;left:50%;transform:translateX(-50%);width:280px;height:120px;object-fit:contain;">'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Enlarged the KSA image block');
