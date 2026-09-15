const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const regexAr = /<h4 style="font-size:12\.5px;(.*?)>(.*?)<\/h4>/;

if (regexAr.test(serverJs)) {
    serverJs = serverJs.replace(regexAr, '<h4 style="font-size:7px;$1>$2</h4>');
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Arabic font size updated to 7px.");
} else {
    console.log("Could not find the Arabic text element.");
}
