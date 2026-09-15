const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const oldMOH = 'style="height:100px;object-fit:contain;margin-bottom:10px;"';
const newMOH = 'style="height:115px;object-fit:contain;margin-bottom:10px;"';

if (serverJs.includes(oldMOH)) {
    serverJs = serverJs.replace(oldMOH, newMOH);
    fs.writeFileSync('server.js', serverJs, 'utf8');
    console.log("Updated MOH logo height to 115px.");
} else {
    console.log("Could not find oldMOH logo style.");
}
