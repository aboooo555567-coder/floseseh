const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /margin-top:40px; height:270px;/g,
    'margin-top:15px; height:290px;'
);

serverJs = serverJs.replace(
    /<img src="\$\{mohLogo\}" style="height:105px;object-fit:contain;">/g,
    '<img src="${mohLogo}" style="height:130px;object-fit:contain;">'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Enlarged MOH logo and raised footer');
