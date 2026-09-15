const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /size=100x100&data=\$\{encodeURIComponent\(d\.leaveId \|\| 'SEHA'\)\}" style="width:100px;height:100px;"/g,
    'size=80x80&data=${encodeURIComponent(d.leaveId || \'SEHA\')}" style="width:80px;height:80px;"'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Shrunk QR code');
