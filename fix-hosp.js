const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /<h3 style="font-size:14px;font-weight:bold;font-family:'Tajawal',sans-serif;margin:0 0 3px 0;color:#333;">\$\{d\.hospitalAr \|\| ''\}<\/h3>/g,
    '<h3 style="font-size:16px;font-weight:bold;font-family:\'Tajawal\',sans-serif;margin:0 0 3px 0;color:#333;">${d.hospitalAr || \'\'}</h3>'
);

serverJs = serverJs.replace(
    /<h4 style="font-size:12px;font-weight:bold;font-family:'Arial',sans-serif;margin:0 0 3px 0;color:#333;">\$\{d\.hospitalEn \|\| ''\}<\/h4>/g,
    '<h4 style="font-size:14px;font-weight:bold;font-family:\'Arial\',sans-serif;margin:0 0 3px 0;color:#333;">${d.hospitalEn || \'\'}</h4>'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Enlarged hospital names');
