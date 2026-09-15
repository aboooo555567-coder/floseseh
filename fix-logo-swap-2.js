const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace: src="${mohLogo}"  ->  src="${d.hospitalLogoBase64 || mohLogo}"
const search = 'src="${mohLogo}" style="height:115px;object-fit:contain;margin-bottom:10px;"';
const replace = 'src="${d.hospitalLogoBase64 || mohLogo}" style="height:115px;object-fit:contain;margin-bottom:10px;"';

if (serverJs.includes(search)) {
    serverJs = serverJs.replace(search, replace);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated server.js: PDF now uses user-uploaded logo if available.");
} else {
    console.log("Could not find matching string in server.js.");
}
