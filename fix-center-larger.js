const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /style="position:absolute;top:50px;left:50%;transform:translateX\(-50%\);width:280px;height:120px;object-fit:contain;"/g,
    'style="position:absolute;top:40px;left:50%;transform:translateX(-50%);width:340px;height:145px;object-fit:contain;"'
);

serverJs = serverJs.replace(
    /<!-- Data Table -->\s*<div style="position:absolute;top:185px;left:40px;width:714px;">/,
    '<!-- Data Table -->\n  <div style="position:absolute;top:205px;left:40px;width:714px;">'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Enlarged center logo again and moved table');
