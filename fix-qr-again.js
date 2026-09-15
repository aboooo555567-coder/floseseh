const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /size=80x80&data=\$\{encodeURIComponent\(d\.leaveId \|\| 'SEHA'\)\}" style="width:80px;height:80px;"/g,
    'size=65x65&data=${encodeURIComponent(d.leaveId || \'SEHA\')}" style="width:65px;height:65px;"'
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('Shrunk QR code again');
