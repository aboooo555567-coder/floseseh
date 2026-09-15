const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const oldLogo = `<img src="\${sehaLogo}" style="position:absolute;top:-5px;left:15px;width:175px;">`;
const newLogo = `<img src="\${sehaLogo}" style="position:absolute;top:-28px;left:15px;width:215px;">`;

if (serverJs.includes(oldLogo)) {
    serverJs = serverJs.replace(oldLogo, newLogo);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated Seha logo size and position successfully.");
} else {
    console.log("Could not find old logo string.");
}
