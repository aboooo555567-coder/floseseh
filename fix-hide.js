const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /<!-- Header: Arabic Title -->[\s\S]*?<div style="position:absolute;top:108px;left:0;width:794px;text-align:center;">/g,
    '<!-- Header: Arabic Title -->\n  <div style="display:none; position:absolute;top:108px;left:0;width:794px;text-align:center;">'
);

serverJs = serverJs.replace(
    /<!-- Header: English Title -->[\s\S]*?<div style="position:absolute;top:138px;left:0;width:794px;text-align:center;">/g,
    '<!-- Header: English Title -->\n  <div style="display:none; position:absolute;top:138px;left:0;width:794px;text-align:center;">'
);

serverJs = serverJs.replace(
    /<!-- Horizontal separator line -->[\s\S]*?<div style="position:absolute;top:170px;left:40px;width:714px;height:1px;background:#dee2e6;">/g,
    '<!-- Horizontal separator line -->\n  <div style="display:none; position:absolute;top:170px;left:40px;width:714px;height:1px;background:#dee2e6;">'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Hid titles and separator line');
