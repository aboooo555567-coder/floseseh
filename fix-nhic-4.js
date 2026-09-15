const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Increase footer height again
serverJs = serverJs.replace(
    /margin-top:40px; height:240px;/g,
    'margin-top:40px; height:270px;'
);

// 2. Enlarge NHIC logo
serverJs = serverJs.replace(
    /<img src="\$\{nhicLogo\}" style="height:95px;">/g,
    '<img src="${nhicLogo}" style="height:140px;">'
);

// 3. Adjust right margin for the larger logo if needed (currently -20px)
serverJs = serverJs.replace(
    /margin-right:-20px;/g,
    'margin-right:-30px;'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Enlarged NHIC logo significantly');
