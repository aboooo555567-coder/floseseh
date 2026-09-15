const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const oldLine = '<img src="${ksaCalligraphy}" style="position:absolute;top:20px;left:50%;transform:translateX(-50%);width:140px;height:55px;object-fit:contain;">';
const newLine = '<img src="${ksaCalligraphy}" style="position:absolute;top:50px;left:50%;transform:translateX(-50%);width:280px;height:120px;object-fit:contain;">';

serverJs = serverJs.replace(oldLine, newLine);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Fixed center image line');
