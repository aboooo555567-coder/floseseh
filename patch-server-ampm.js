const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(/\$\{d\.admissionH \|\| ''\} - \$\{d\.admissionTime \|\| ''\}/g, "${d.admissionH || ''} - ${d.admissionTimeAr || ''}");
serverJs = serverJs.replace(/\$\{d\.dischargeH \|\| ''\} - \$\{d\.dischargeTime \|\| ''\}/g, "${d.dischargeH || ''} - ${d.dischargeTimeAr || ''}");

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log("Patched server.js for Arabic AM/PM!");
