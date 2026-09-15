const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const oldLicense = "font-size:10px;color:#555;margin:0;";
const newLicense = "font-size:13px;font-weight:bold;color:#000;margin:0;";

if (serverJs.includes(oldLicense)) {
    serverJs = serverJs.replace(oldLicense, newLicense);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated license font size to match hospital name.");
} else {
    console.log("Could not find oldLicense");
}
