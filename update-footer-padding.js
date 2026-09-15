const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const regex = /<div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0 15px; margin-top:10px; margin-bottom:-25px;">/;
const replacement = '<div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0; margin-top:10px; margin-bottom:-25px;">';

if (regex.test(serverJs)) {
    serverJs = serverJs.replace(regex, replacement);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated footer padding successfully.");
} else {
    console.log("Could not find the footer padding element.");
}
