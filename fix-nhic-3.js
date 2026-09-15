const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /<img src="\$\{nhicLogo\}" style="height:75px;">/g,
    '<img src="${nhicLogo}" style="height:95px;">'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Enlarged NHIC logo');
