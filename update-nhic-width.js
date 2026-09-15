const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace the 7px back to 11.5px for the Arabic text to balance the width
const regexAr = /<h4 style="font-size:7px;(.*?)>(.*?)<\/h4>/;

if (regexAr.test(serverJs)) {
    serverJs = serverJs.replace(regexAr, '<h4 style="font-size:11.5px;$1>$2</h4>');
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Arabic font size updated to 11.5px to match width.");
} else {
    console.log("Could not find the 7px Arabic text element.");
}
