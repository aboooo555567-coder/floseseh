const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /style="position:absolute;top:15px;left:40px;width:145px;"/g,
    'style="position:absolute;top:5px;left:40px;width:175px;"'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Enlarged Seha logo again and moved it up');
