const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /<img src="\$\{mohLogo\}" style="height:80px;">/g,
    '<img src="${mohLogo}" style="height:105px;object-fit:contain;">'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Enlarged MOH logo');
