const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const searchRegex = /\$\{encodeURIComponent\("https:\/\/www\.seha\.sa\/#\/inquiries\/slenquiry"\)\}/g;
const replace = `\${encodeURIComponent(\`https://www.seha.sa/#/inquiries/slenquiry?id=\${d.leaveId}&nin=\${d.nationalId}\`)}`;

if (searchRegex.test(serverJs)) {
    serverJs = serverJs.replace(searchRegex, replace);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated QR Code URL with parameters.");
} else {
    console.log("Not found.");
}
