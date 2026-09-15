const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /<!-- Header: Kingdom text -->[\s\S]*?<div style="position:absolute;top:78px;left:0;width:794px;text-align:center;">/g,
    '<!-- Header: Kingdom text -->\n  <div style="display:none; position:absolute;top:78px;left:0;width:794px;text-align:center;">'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Hid Kingdom of Saudi Arabia text');
