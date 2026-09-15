const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<svg width="260" height="120" viewBox="0 0 250 120" style="position:absolute;top:0px;right:0px;opacity:0\.7;">/;
const newSvg = '<svg width="180" height="85" viewBox="0 0 250 120" style="position:absolute;top:25px;right:0px;opacity:0.7;">';

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, newSvg);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("SVG size and position adjusted successfully.");
} else {
    console.log("Could not find the SVG tag to replace.");
}
