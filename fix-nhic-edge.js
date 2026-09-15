const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

const search = `padding-bottom:0px; margin-bottom:-28px; margin-right:-18px;`;
const replace = `padding-bottom:0px; margin-bottom:-35px; margin-right:-30px;`;

if (serverJs.includes(search)) {
    serverJs = serverJs.replace(search, replace);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Lowered NHIC logo and pushed it to the right edge.");
} else {
    console.log("Could not find the target string.");
}
