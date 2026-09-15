const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /style="position:absolute;top:30px;left:40px;width:120px;"/g,
    'style="position:absolute;top:15px;left:40px;width:145px;"'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed Seha logo');
